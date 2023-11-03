import logging
import time
from multiprocessing import Process, Pipe

import torch
import torch.nn.functional as F
from anytree import Node
from anytree.search import find, findall
from transformers import BertJapaneseTokenizer, BertModel

from model import GPTExtractor


logger = logging.getLogger(__name__)


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


class SentenceSimilaritySearch:
    def __init__(self, MODEL_NAME: str = 'cl-tohoku/bert-base-japanese-whole-word-masking') -> None:
        self.tokenizer = BertJapaneseTokenizer.from_pretrained(MODEL_NAME)
        self.model = BertModel.from_pretrained(MODEL_NAME)
    
    def sentence_to_vector(self, sentence: str) -> torch.Tensor:
        # 文を単語に区切って数字にラベル化
        tokens = self.tokenizer(sentence)["input_ids"]
        
        # BERTモデルの処理のためtensor型に変換
        input = torch.tensor(tokens).reshape(1, -1)
        
        # BERTモデルに入力し文のベクトルを取得
        with torch.no_grad():
            outputs = self.model(input, output_hidden_states=True)
            last_hidden_state = outputs.last_hidden_state[0]
            averaged_hidden_state = last_hidden_state.sum(dim=0) / len(last_hidden_state) 
        
        return averaged_hidden_state


class TreeManager:
    def __init__(self, root_node_keyword: str = "楽") -> None:
        self.search_engine = SentenceSimilaritySearch()
        self.root_node = Node(root_node_keyword, embedding=self.search_engine.sentence_to_vector(root_node_keyword))
        self.idea_candidates_dict = {}

    def add_ideas(self, idea_list: list[str]) -> list[tuple[str, str]]:
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
            embedding = self.search_engine.sentence_to_vector(idea)
            max_cosine_similarity = -1.0

            # 類似度が最大のノードを探す
            for node in findall(self.root_node):
                cosine_similarity = F.cosine_similarity(node.embedding, embedding, dim=0).detach().numpy()
                if cosine_similarity > max_cosine_similarity:
                    max_cosine_similarity = cosine_similarity
                    parent_node = node

            # 類似度が最大のノードの子ノードとして追加
            Node(idea, embedding=embedding, parent=parent_node)
            idea_parent_node_combination.append((idea, parent_node.name))
        return idea_parent_node_combination

    def get_candidate_ideas(self, idea_parent_node_combination):
        for idea, _ in idea_parent_node_combination:
            node = find(self.root_node, filter_=lambda node: node.name == idea)
            related_ideas = []            
            while node.parent:
                related_ideas.append(node.parent.name)
                node = node.parent

            
            self.idea_candidates_dict[idea] = related_ideas





def mainloop(conn, interval: int = 10, theme: str = "「楽」をテーマにAIを活用したプロダクトを作るハッカソン"):
    secretary = Secretary()
    llm = GPTExtractor(theme)
    tree_manager = TreeManager(theme)
    while True:
        time.sleep(interval)

        # queueが空になるまで読む
        while True:
            try:
                text, speaker = conn.recv()
                secretary.note(text, speaker)
            except Exception:
                break

        # 直近の会話を取得
        sentence = secretary.get_sentence()
        logger.info(sentence)

        # アイデアリストを抽出
        idea_list = llm.extract_ideas(sentence)
        if len(idea_list) == 0:
            continue
        logger.info(idea_list)

        # アイデアをツリーに追加
        idea_parent_node_combination = tree_manager.add_ideas(idea_list)
        conn.send(idea_parent_node_combination)


def initialize():
    parent_conn, child_conn = Pipe()
    p = Process(target=mainloop, args=(child_conn,))
    p.start()
    return parent_conn
