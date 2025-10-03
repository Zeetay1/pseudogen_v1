# backend/utils.py
import time
import openai
from requests.exceptions import RequestException

def call_openai_with_retries(prompt, model="gpt-4o-mini", max_retries=3, backoff=1.0):
    last_err = None
    for attempt in range(1, max_retries + 1):
        try:
            resp = openai.ChatCompletion.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1200,
            )
            # defensive checks:
            if "choices" in resp and len(resp.choices) > 0:
                text = resp.choices[0].message.get("content", "").strip()
                if text:
                    return text
            raise RuntimeError("Empty response from model")
        except Exception as e:
            last_err = e
            if attempt < max_retries:
                time.sleep(backoff * attempt)
            else:
                raise
