#!/usr/bin/env python3
"""
Minimal LoRA fine-tuning script using Hugging Face Transformers + PEFT.

This script is a starting point. It is intended for GPUs and assumes you have installed the packages
in `requirements.txt`. It supports loading a base causal LM and training LoRA adapters on a small
instruction-response dataset in JSONL format where each line contains {"instruction":..., "response":...}.

Use carefully: for production training you'll want to add logging, evaluation, checkpointing and better batching.
"""
import argparse
import json
from pathlib import Path

import torch
from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    DataCollatorForLanguageModeling,
    TrainingArguments,
    Trainer,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--model_name_or_path", required=True)
    p.add_argument("--train_file", required=True)
    p.add_argument("--output_dir", required=True)
    p.add_argument("--num_train_epochs", type=int, default=1)
    p.add_argument("--per_device_train_batch_size", type=int, default=4)
    p.add_argument("--learning_rate", type=float, default=2e-4)
    p.add_argument("--max_length", type=int, default=512)
    return p.parse_args()


def load_jsonl(tokenizer, path: str, max_length: int):
    ds = load_dataset("json", data_files={"train": path})["train"]

    def convert(example):
        prompt = f"Instruction: {example['instruction']}\n\nResponse: {example['response']}"
        tok = tokenizer(prompt, truncation=True, max_length=max_length)
        return {"input_ids": tok.input_ids, "attention_mask": tok.attention_mask}

    ds = ds.map(convert, remove_columns=ds.column_names)
    return ds


def main():
    args = parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.model_name_or_path, use_fast=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load model (use 8-bit if bitsandbytes installed and supported)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading model {args.model_name_or_path} on {device}")
    model = AutoModelForCausalLM.from_pretrained(
        args.model_name_or_path,
        device_map="auto" if torch.cuda.is_available() else None,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        load_in_8bit=False,
    )

    # Prepare for k-bit training if needed
    model = prepare_model_for_kbit_training(model)

    # Configure LoRA
    lora_config = LoraConfig(
        r=8,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
    )

    model = get_peft_model(model, lora_config)

    # Load dataset
    ds = load_jsonl(tokenizer, args.train_file, args.max_length)

    data_collator = DataCollatorForLanguageModeling(tokenizer, mlm=False)

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_device_train_batch_size=args.per_device_train_batch_size,
        num_train_epochs=args.num_train_epochs,
        learning_rate=args.learning_rate,
        logging_steps=10,
        save_strategy="epoch",
        fp16=torch.cuda.is_available(),
        remove_unused_columns=False,
        optim="paged_adamw_8bit" if torch.cuda.is_available() else "adamw_torch",
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=ds,
        data_collator=data_collator,
    )

    trainer.train()
    print("Training complete. Saving LoRA adapter to output_dir")
    model.save_pretrained(args.output_dir)


if __name__ == "__main__":
    main()
