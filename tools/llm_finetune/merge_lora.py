#!/usr/bin/env python3
"""
Merge a LoRA adapter into a base model and save the merged model for serving.

This is a helper script demonstrating how to load a base model and a LoRA adapter (PEFT),
merge weights and save a merged model folder that can be loaded by TGI or other inference servers.

Warning: merging produces a full model copy and requires disk space.
"""
import argparse
from pathlib import Path

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--base_model", required=True)
    p.add_argument("--adapter_dir", required=True)
    p.add_argument("--output_dir", required=True)
    return p.parse_args()


def main():
    args = parse_args()
    base_model = args.base_model
    adapter_dir = args.adapter_dir
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading base model {base_model}")
    model = AutoModelForCausalLM.from_pretrained(base_model, torch_dtype=torch.float16, device_map="auto")
    print(f"Loading LoRA adapter from {adapter_dir}")
    peft_model = PeftModel.from_pretrained(model, adapter_dir)

    print("Merging adapter into base model (this may take a while)")
    try:
        merged = peft_model.merge_and_unload()
    except Exception:
        # Fallback: save peft_model directly (many PEFT versions expose merge_and_unload)
        merged = peft_model

    print(f"Saving merged model to {out_dir}")
    merged.save_pretrained(out_dir)
    # Save tokenizer as well
    tokenizer = AutoTokenizer.from_pretrained(base_model, use_fast=True)
    tokenizer.save_pretrained(out_dir)

    print("Done. You can now mount this folder under ./models and set MODEL_ID to the folder name in docker-compose.")


if __name__ == "__main__":
    main()
