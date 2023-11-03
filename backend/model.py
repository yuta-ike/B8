import openai
import logging
logger = logging.getLogger(__name__)


class LLMMock:
    def extract_keywords(self, sentence: str) -> list[str]:
        return ["apple", "banana", "orange"]


MODEL_NAME = "gpt-3.5-turbo"
TEMPERATURE = 0.0
openai.api_key = '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'

system_prompt = "あなたは、{}に関するブレインストーミング会議の書紀だ。"
extract_idea_prompt = """# 指示
以下の入力からアイデアを箇条書きで抽出しなさい。
ただし、制約条件を必ず満たすこと。

# 制約条件
・{}に関するアイデアのみ抽出しなさい。
・{}に関するアイデアが存在しない場合は、「アイデアなし」と出力しなさい。例えば、アイデア出しの方針に関する発言は抽出しない。
・あくまで入力の内容をそのまま抽出するだけで、内容を拡張しないこと。
・アイデアが存在する場合は、20字以下で出力しなさい。
・アイデアが存在する場合は、根拠となる文章を入力からそのまま抜粋しなさい。
・アイデアが存在する場合は、以下の形式で出力しなさい（鍵括弧は不要）
- アイデア：「ここに抽出したアイデアを記載」
　　　根拠:「ここに根拠を記載」
- アイデア：「ここに抽出したアイデアを記載」
　　　根拠：「ここに根拠を記載」

# 入力
{}"""


class GPTExtractor:
    def __init__(self, theme):
        self.theme = theme

    def extract_keywords(self, sentence):
        idea_list = []
        theme = self.theme
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {'role': 'system', 'content': system_prompt.format(theme)},
                {'role': 'user', 'content': extract_idea_prompt.format(
                    theme,
                    theme,
                    sentence)}
            ],
            temperature=TEMPERATURE,
        )
        res = response['choices'][0]['message']['content']
        logger.info(res)

        if "アイデアなし" in res:
            return []
        for idea in res.split("\n"):
            if ("根拠" in idea) or (len(idea) == 0):
                continue
            idea_list.append(
                idea.replace("「", "").replace("」", "").split("アイデア：")[1]
                )
        return idea_list
