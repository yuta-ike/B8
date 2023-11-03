import os
import openai

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


print(extend_idea_system_prompt.format("aaa"))
