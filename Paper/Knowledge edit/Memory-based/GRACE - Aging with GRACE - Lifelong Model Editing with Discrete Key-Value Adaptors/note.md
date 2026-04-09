# Aging with GRACE: Lifelong Model Editing with Discrete Key-Value Adaptors

## 一句话总结
这篇论文把编辑写成离散的局部记忆，不直接改模型主参数，从而支持长期连续编辑。

## 论文做了什么
作者想解决 deployed model 在连续修补中越来越容易退化的问题。传统参数编辑每改一次都会对原模型造成累积影响，做多了就会遗忘或互相冲突。GRACE 的目标是让模型能边运行边接收新的 spot-fix，同时尽量不伤害原本能力。

## 核心方法
GRACE 在预训练模型的潜在空间里写入一个离散的本地 codebook，把每次编辑存成局部的 key-value 适配记忆，而不是直接改动原模型权重。这样新编辑更像外接补丁，可被持续追加。

## 结果与意义
实验显示，GRACE 能在多种模型上支持上千次连续编辑，并在保持率和泛化性上达到很强表现。它的重要意义是把 lifelong editing 从改参数转向加记忆，开辟了一条不同于 ROME/MEMIT 的路线。
