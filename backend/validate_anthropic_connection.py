from pathlib import Path
from dotenv import load_dotenv
import os
import anthropic


def load_env() -> None:
    env_file = Path(__file__).parent / ".env"
    if env_file.exists():
        load_dotenv(env_file)


def main() -> None:
    load_env()
    api_key = os.getenv("ANTHROPIC_API_KEY")
    model = os.getenv("ANTHROPIC_MODEL", "claude-opus-4-8")

    if not api_key:
        raise SystemExit("ERROR: ANTHROPIC_API_KEY is not set in .env.")

    print("Anthropic SDK version:", anthropic.__version__)
    print("Using model:", model)

    client = anthropic.Anthropic(api_key=api_key)

    try:
        print("Verifying API key and account connectivity...")
        models = client.models.list(limit=50)
        available_ids = [m.id for m in models]
        print("Available Anthropic model IDs:")
        for mid in available_ids:
            print(" -", mid)

        if model not in available_ids:
            print(f"WARNING: configured ANTHROPIC_MODEL '{model}' is not in the available model list.")
            if available_ids:
                print(f"Use one of the supported models above, e.g. '{available_ids[0]}'.")
            raise SystemExit(1)

        print("Testing Claude API request with the configured model...")
        response = client.messages.create(
            model=model,
            system="You are a test assistant.",
            messages=[{"role": "user", "content": "Say hello."}],
            max_tokens=16,
        )

        if response and getattr(response, "content", None):
            print("Anthropic request succeeded. Response text:")
            print(response.content[0].text)
        else:
            print("Anthropic request succeeded but response content was empty.")

    except Exception as exc:
        print("Anthropic connection test failed:", repr(exc))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
