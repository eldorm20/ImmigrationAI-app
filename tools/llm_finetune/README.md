# LLaMA/Instruction-model fine-tuning (LoRA) — quickstart

This folder contains a minimal, reproducible starting point to fine-tune an open-source instruction model with LoRA (parameter-efficient finetuning). It is intended for small-to-medium scale fine-tuning on GPU instances and can be adapted to cloud runners or HF training.

Overview
- `finetune_lora.py` — example script that loads a model, applies PEFT/LoRA, and trains on a JSONL dataset.
- `requirements.txt` — Python dependencies.
- `example_data/train.jsonl` — tiny example dataset in instruction/response format.

Recommended model candidates (choose one):
- `mistralai/Mistral-7B-Instruct` — strong instruction model (check license & availability).
- `OpenAssistant/replit-1b-instruct` or `OpenAssistant/oasst-sft-1-pythia-12b` — community instruction-tuned models.
- `dolly` or `databricks/dolly-v2-3b` — permissive license alternatives.

Notes & guidance
- Fine-tuning large models requires GPU with enough memory. Use `bitsandbytes` + `load_in_8bit=True` and `device_map="auto"` to reduce memory.
- Use Hugging Face Hub to store resulting adapters (LoRA weights) instead of full model weights.
- If you need very lightweight local inference, consider exporting LoRA adapters and using `peft` to load them on top of the base model at inference time.

Quick start (example)
1. Create a Python virtualenv and install dependencies:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Prepare a JSONL training file. Each line should be an object with `instruction` and `response` keys. See `example_data/train.jsonl`.

3. Run the finetune script (adjust model and paths):
```bash
python finetune_lora.py \
  --model_name_or_path "mistralai/Mistral-7B-Instruct" \
  --train_file example_data/train.jsonl \
  --output_dir output/lora-mistral-7b \
  --per_device_train_batch_size 4 \
  --num_train_epochs 1
```

4. After training, push the LoRA adapter or zip artifacts to HF Hub or your storage and load them at runtime.

Important: this is a minimal script. For production you should add proper dataset validation, training monitoring (e.g., TensorBoard), checkpointing, and evaluation.

If you'd like, I can:
- Add an automated HF `accelerate` config and an example `huggingface` upload step.
- Create a small curated dataset from your app's prompts/responses and prepare tokenization/cleaning.
- Wire the adapter load into the server to use the fine-tuned model for eligibility/document-analysis endpoints.
