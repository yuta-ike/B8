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


logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.DEBUG)
handler_format = logging.Formatter(
    "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
stream_handler.setFormatter(handler_format)
logger.addHandler(stream_handler)

MODEL_NAME = "gpt-3.5-turbo"
TEMPERATURE = 0.0
openai.api_key = os.environ.get("OPENAI_KEY")

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
        self.script_list[-1] += text

    def get_recent_talk(self, num: int = 3) -> str:
        talk = ""
        for script in self.script_list[-num:]:
            talk += script
            talk += "\n"
        return talk


class TreeManager:
    def __init__(
        self, EMBEDDING_MODEL: str = "text-embedding-ada-002", theme: str = "楽"
    ) -> None:
        self.EMBEDDING_MODEL = EMBEDDING_MODEL
        self.theme = theme
        self.root_node = Node(theme, embedding=self.sentence_to_embedding(theme))
        self.idea_candidates_dict = defaultdict(list)

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
        return idea_list

    def sentence_to_embedding(self, idea: str) -> list[float]:
        res = openai.Embedding.create(input=[idea], model=self.EMBEDDING_MODEL)
        embedding = res["data"][0]["embedding"]
        return embedding

    def cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> np.ndarray:
        # openai.embeddings_utils.cosine_similarity()
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def add_ideas(
        self, idea_list: list[str], threshold: float = 0.9
    ) -> list[tuple[str, str]]:
        """
        会話から抽出されたアイデアを、類似度が最も大きいノードと連結する
        Args:
            idea_list: 会話からChatGPTにより抽出されたアイデアのリスト
        Returns:
            [WIP] idea_parent_node_combination: アイデアとそれが連結した親ノードの組み合わせを格納したリスト
        """
        idea_parent_node_combination = []
        for idea in idea_list:
            assert len(idea) > 0
            embedding = self.sentence_to_embedding(idea)
            max_cosine_similarity = -1.0

            # 類似度が最大のノードを探す
            for node in findall(self.root_node):
                cosine_similarity = self.cosine_similarity(node.embedding, embedding)
                if cosine_similarity > max_cosine_similarity:
                    max_cosine_similarity = cosine_similarity
                    parent_node = node

            # 類似度が最大のノードの子ノードとして追加

            if max_cosine_similarity > threshold:
                continue
            Node(idea, embedding=embedding, parent=parent_node)
            idea_parent_node_combination.append((idea, parent_node.name))
        return idea_parent_node_combination

    def update_candidate_ideas(
        self, idea_parent_node_combination: list[tuple[str, str]]
    ):
        for idea, _ in idea_parent_node_combination:
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


def mainloop(conn, interval: int = 10, theme: str = "「楽」をテーマにAIを活用したプロダクトを作るハッカソン"):
    secretary = Secretary()
    tree_manager = TreeManager(theme)
    while True:
        time.sleep(interval)

        # queueが空になるまで読む
        while True:
            try:
                text, speaker = conn.recv()
                secretary.note(text, speaker)
                reset_timer()
            except Exception:
                break

        # 直近の会話を取得
        sentence = secretary.get_sentence()
        logger.info(sentence)

        # アイデアリストを抽出
        idea_list = tree_manager.extract_ideas(sentence)
        if len(idea_list) == 0:
            continue
        logger.info(idea_list)

        # アイデアをツリーに追加
        idea_parent_node_combination = tree_manager.add_ideas(idea_list)
        conn.send(idea_parent_node_combination)

        # 候補となるアイデアのハッシュを更新
        threading.Thread(
            target=tree_manager.update_candidate_ideas,
            args=(idea_parent_node_combination),
        ).start()
        # tree_manager.update_candidate_ideas(idea_parent_node_combination)


def initialize():
    # freeze_support()
    parent_conn, child_conn = Pipe()
    p = Process(target=mainloop, args=(child_conn,))
    p.start()
    return parent_conn
