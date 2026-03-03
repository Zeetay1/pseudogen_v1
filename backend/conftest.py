# Set before app import so tests run without real .env
import os
os.environ["SKIP_ENV_CHECK"] = "1"
