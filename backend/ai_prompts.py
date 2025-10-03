# backend/ai_prompts.py
TEMPLATES = {
    "Academic": (
        "You are an academic assistant. Convert the following problem into academic-style pseudocode.\n\n"
        "Problem:\n{user_input}\n\nDetail level: {detail}\n\nOutput: Markdown formatted pseudocode with clear variable definitions."
    ),
    "Developer-Friendly": (
        "You are a senior software engineer. Produce developer-friendly pseudocode for:\n\n{user_input}\n\nDetail: {detail}\n\nReturn code-style pseudocode in Markdown."
    ),
    "English-Like": (
        "Rewrite the problem as step-by-step plain English instructions suitable for beginners:\n\n{user_input}\n\nDetail: {detail}\n\nUse numbered steps."
    ),
    "Step-by-Step": (
        "Create a step-by-step plan that a developer could implement. Problem:\n\n{user_input}\n\nDetail: {detail}"
    ),
}
