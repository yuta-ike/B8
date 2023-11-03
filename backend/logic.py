import time
from multiprocessing import Process, Pipe
import logging
from model import LLMMock, GPTExtractor

logger = logging.getLogger(__name__)


class Secretary:
    def __init__(self):
        self.script = {}

    def note(self, text, user):
        if user not in self.script.keys():
            self.script[user] = []

        self.script[user].append(text)

    def get_recent_talk(self, num=3):
        talk = ""
        for user, history in self.script.items():
            talk += "\n".join(history[-num:])
            talk += "\n"
        return talk


class TreeManagerMock:
    def add_keywords(self, keywords: list[str]):

        pass


def mainloop(conn):
    secretary = Secretary()
    llm = LLMMock()
    llm = GPTExtractor("テーマ")
    tree_manager = TreeManagerMock()
    while True:
        time.sleep(10)

        # queueが空になるまで読む
        while True:
            try:
                text, user = conn.recv()
                secretary.note(text, user)
            except Exception:
                break

        sentence = secretary.get_sentence()
        logger.info(sentence)
        keywords = llm.extract_keywords(sentence)
        if len(keywords) == 0:
            continue
        logger.info(keywords)

        diff = tree_manager.add_keywords(keywords)
        conn.send(diff)


def initialize():
    parent_conn, child_conn = Pipe()
    p = Process(target=mainloop, args=(child_conn,))
    p.start()
    return parent_conn
