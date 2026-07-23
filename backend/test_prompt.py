import os
import glob
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

# Load environment variables (.env in backend/ or root)
load_dotenv()
load_dotenv(Path(__file__).parent / ".env")

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("WARNING: GROQ_API_KEY not found in environment or .env file.")

client = Groq(api_key=api_key) if api_key else Groq()

# Paths
BASE_DIR = Path(__file__).parent.parent
PROMPT_FILE = BASE_DIR / "prompts" / "extract_action_items.md"
SAMPLES_DIR = BASE_DIR / "samples"


def load_prompt() -> str:
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        return f.read()


def run_tests():
    prompt_text = load_prompt()
    sample_files = sorted(glob.glob(str(SAMPLES_DIR / "*.txt")))

    if not sample_files:
        print(f"No .txt sample files found in {SAMPLES_DIR}")
        return

    model_name = "llama-3.3-70b-versatile"
    success_count = 0
    total_count = len(sample_files)

    print(f"Starting test run over {total_count} sample files using {model_name} (Groq SDK)...\n")

    for idx, sample_path in enumerate(sample_files):
        filename = Path(sample_path).name
        print("==================================================")
        print(f"Testing Sample [{idx+1}/{total_count}]: {filename}")
        print("==================================================")

        with open(sample_path, "r", encoding="utf-8") as f:
            notes = f.read()

        full_prompt = f"{prompt_text}\n\nMeeting Notes:\n{notes}"

        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "user", "content": full_prompt}
                ]
            )
            raw_text = response.choices[0].message.content.strip() if response.choices else ""

            # Clean possible markdown code fences if present despite instructions
            cleaned_text = raw_text
            if cleaned_text.startswith("```"):
                lines = cleaned_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned_text = "\n".join(lines).strip()

            print("--- Raw Model Response ---")
            print(raw_text)
            print("--------------------------")

            # Validate JSON parsing
            parsed_json = json.loads(cleaned_text)

            # Check structure
            has_summary = "summary" in parsed_json and isinstance(parsed_json["summary"], list)
            has_decisions = "decisions" in parsed_json and isinstance(parsed_json["decisions"], list)
            has_action_items = "action_items" in parsed_json and isinstance(parsed_json["action_items"], list)

            if has_summary and has_decisions and has_action_items:
                print("Result: [SUCCESS] json.loads() succeeded & valid schema structure.")
                success_count += 1
            else:
                print("Result: [FAIL] json.loads() succeeded but missing expected keys.")
        except json.JSONDecodeError as e:
            print(f"Result: [FAIL] json.loads() failed: {e}")
        except Exception as e:
            print(f"Result: [FAIL] API call error: {e}")

        print("\n")
        # 1-second delay between sample calls to stay well within rate limits
        if idx < total_count - 1:
            time.sleep(1)

    print("==================================================")
    print(f"FINAL SUMMARY: {success_count}/{total_count} samples parsed successfully.")
    print("==================================================")


if __name__ == "__main__":
    run_tests()
