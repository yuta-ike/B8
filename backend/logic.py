import logging
import os
import time
from collections import defaultdict
from multiprocessing import Process, Pipe

import openai
import numpy as np
from anytree import Node
from anytree.search import find, findall
import threading
import uuid
import env

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.DEBUG)
handler_format = logging.Formatter(
    "%(asctime)s - %(name)s - %(funcName)s - %(lineno)d - %(levelname)s - %(message)s"
)
stream_handler.setFormatter(handler_format)
logger.addHandler(stream_handler)

MODEL_NAME = "gpt-3.5-turbo"
TEMPERATURE = 0.0
openai.api_key = env.OPENAI_API_KEY

with open("prompt/extract_idea_system_prompt.txt") as f:
    extract_idea_system_prompt = f.read()
with open("prompt/extract_idea_prompt.txt") as f:
    extract_idea_prompt = f.read()
with open("prompt/extend_idea_system_prompt.txt") as f:
    extend_idea_system_prompt = f.read()
with open("prompt/extend_idea_prompt.txt") as f:
    extend_idea_prompt = f.read()

global_dict = {}


class Secretary:
    def __init__(self) -> None:
        self.script_list = []
        self.current_speaker = None

    def note(self, text: str, speaker: str) -> None:
        # *NOTE: speakerが変わったら、スクリプトを更新する
        if self.current_speaker != speaker:
            self.current_speaker = speaker
            self.script_list.append(f"{speaker}: ")

        # 発言内容を追加
        self.script_list[-1] += "\n" + text

    def get_recent_talk(self, num: int = 3) -> str:
        talk = ""
        for script in self.script_list[-num:]:
            talk += script
            talk += "\n\n"
        return talk


class TreeManager:
    def __init__(
        self,
        EMBEDDING_MODEL: str = "text-embedding-ada-002",
        theme: str = "楽",
        max_cosine_similarity_threshold: float = 0.95,
        min_cosine_similarity_threshold: float = 0.3,
    ) -> None:
        self.EMBEDDING_MODEL = EMBEDDING_MODEL
        self.theme = theme
        self.max_cosine_similarity_threshold = max_cosine_similarity_threshold
        self.min_cosine_similarity_threshold = min_cosine_similarity_threshold
        self.root_node = Node(
            theme, embedding=self.sentence_to_embedding(theme), id="rootid"
        )
        self.idea_candidates_dict = defaultdict(list)
        self.update_candidate_ideas([(None, None, theme)])

    def add(self, parent_node_id: str, new_node_id: str) -> str:
        parent_node = find(
            self.root_node, filter_=lambda node: node.id == parent_node_id
        )
        new_idea = self.idea_candidates_dict[parent_node.name].pop()

        Node(new_idea, id=new_node_id, parent=parent_node, embedding=None)

        self.update_candidate_ideas([(parent_node_id, new_node_id, new_idea)])
        return new_idea

    def update(self, node_id: str, text: str) -> None:
        node = find(self.root_node, filter_=lambda node: node.id == node_id)
        node.name = text
        embedding = self.sentence_to_embedding(text)
        node.embedding = embedding
        self.update_candidate_ideas([(None, None, text)])

    def extract_ideas(self, sentence: str) -> list[str]:
        idea_list = []
        response = openai.ChatCompletion.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": extract_idea_system_prompt.format(self.theme),
                },
                {
                    "role": "user",
                    "content": extract_idea_prompt.format(
                        self.theme, self.theme, sentence
                    ),
                },
            ],
            temperature=TEMPERATURE,
        )
        res = response["choices"][0]["message"]["content"]
        logger.info(res)

        if "アイデアなし" in res:
            return []

        for idea in res.split("\n"):
            if ("根拠" in idea) or (len(idea) == 0):
                continue
            idea_list.append(idea.replace("「", "").replace("」", "").split("アイデア：")[1])

        no_dupplicate_idea_list = []
        [
            no_dupplicate_idea_list.append(idea)
            for idea in idea_list
            if idea not in no_dupplicate_idea_list
        ]
        return no_dupplicate_idea_list

    def sentence_to_embedding(self, idea: str) -> list[float]:
        res = openai.Embedding.create(input=[idea], model=self.EMBEDDING_MODEL)
        embedding = res["data"][0]["embedding"]
        return embedding

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        # openai.embeddings_utils.cosine_similarity()
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def add_ideas(
        self, idea_list: list[str], threshold: float = 0.9
    ) -> list[tuple[str, str, str]]:
        """
        会話から抽出されたアイデアを、類似度が最も大きいノードと連結する
        Args:
            idea_list: 会話からChatGPTにより抽出されたアイデアのリスト
        Returns:
            [WIP] idea_parent_node_combination: アイデアとそれが連結した親ノードの組み合わせを格納したリスト
        """
        idea_parent_node_combination = []
        node_queue = []
        for idea in idea_list:
            assert len(idea) > 0
            embedding = self.sentence_to_embedding(idea)
            max_cosine_similarity = -1.0

            # 類似度が最大のノードを探す
            for node in findall(self.root_node):
                if node.embedding is None:
                    continue
                cosine_similarity = self.cosine_similarity(node.embedding, embedding)
                if cosine_similarity > max_cosine_similarity:
                    max_cosine_similarity = cosine_similarity
                    parent_node = node

            # 類似度が高すぎる＝ほとんど似たアイデアの場合や、低すぎる＝関連が小さいアイデアの場合は無視する
            if (max_cosine_similarity > self.max_cosine_similarity_threshold) or (
                max_cosine_similarity < self.min_cosine_similarity_threshold
            ):
                continue

            id = str(uuid.uuid4())
            node_queue.append((idea, embedding, parent_node, id))
            idea_parent_node_combination.append((parent_node.id, id, idea))
        for idea, embedding, parent, id in node_queue:
            Node(idea, embedding=embedding, parent=parent, id=id)
        return idea_parent_node_combination

    def update_candidate_ideas(
        self, idea_parent_node_combination: list[tuple[str, str, str]]
    ):
        for _, _, idea in idea_parent_node_combination:
            node = find(self.root_node, filter_=lambda node: node.name == idea)
            related_ideas = []
            while node.parent:
                related_ideas.append(node.parent.name)
                node = node.parent

            # 候補となるアイデアを生成
            response = openai.ChatCompletion.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": extend_idea_system_prompt.format(self.theme),
                    },
                    {
                        "role": "user",
                        "content": extend_idea_prompt.format(
                            idea, "\n".join(related_ideas)
                        ),
                    },
                ],
                temperature=TEMPERATURE,
            )
            res = response["choices"][0]["message"]["content"]
            logger.info(f"idea: {idea}")
            logger.info(f"res: {res}")

            # 候補となるアイデアを格納
            for extended_idea in res.split("\n"):
                self.idea_candidates_dict[idea].append(
                    extended_idea.replace("-", "").replace(" ", "")
                )


def timeout_function():
    pass


def reset_timer():
    if "timer" in global_dict:
        global_dict["timer"].cancel()

    global_dict["timer"] = threading.Timer(30, timeout_function)
    global_dict["timer"].start()


def mainloop(conn, interval: int = 1, theme: str = "「楽」をテーマにAIを活用したプロダクトを作るハッカソン"):
    secretary = Secretary()
    tree_manager = TreeManager(theme=theme)
    while True:
        time.sleep(interval)

        # queueが空になるまで読む
        say_flg = False
        while conn.poll():
            args = conn.recv()
            logger.info(args)
            if args[0] == "add":
                parent_node_id, new_node_id = args[1:]
                text = tree_manager.add(parent_node_id, new_node_id)
                conn.send(("update", (new_node_id, text)))
            elif args[0] == "update":
                node_id, text = args[1:]
                tree_manager.update(node_id, text)
            elif args[0] == "say":
                say_flg = True
                text, speaker = args[1:]
                secretary.note(text, speaker)
                reset_timer()
            else:
                raise Exception("invalid args")
        if not say_flg:
            continue

        # conn.send([("rootid", "id1", "アイデア1"), ("rootid", "id2", "アイデア2")])
        # while True:
        #     time.sleep(interval)

        logger.info("エージェントがサマる")
        # 直近の会話を取得
        chat = secretary.get_recent_talk()
        logger.info(chat)

        # アイデアリストを抽出
        idea_list = tree_manager.extract_ideas(chat)
        if len(idea_list) == 0:
            continue
        logger.info(idea_list)

        # アイデアをツリーに追加
        idea_parent_node_combination = tree_manager.add_ideas(idea_list)
        logger.info(f"idea-combination {idea_parent_node_combination}")
        conn.send(("bulk_add", idea_parent_node_combination))

        # 候補となるアイデアのハッシュを更新
        # threading.Thread(
        #     target=tree_manager.update_candidate_ideas,
        #     args=(idea_parent_node_combination),
        # ).start()
        tree_manager.update_candidate_ideas(idea_parent_node_combination)


def initialize():
    # freeze_support()
    parent_conn, child_conn = Pipe()
    p = Process(target=mainloop, args=(child_conn,))
    p.start()
    return parent_conn
