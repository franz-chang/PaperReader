# Detoxifying Large Language Models via Knowledge Editing

## 一句话总结
传统的对齐方法（如SFT或DPO）虽然能让模型学会拒绝恶意请求，但它们并没有真正“遗忘”这些有害知识，只是学会了绕道而行。攻击者依然可以通过精心设计的越狱提示词（Jailbreak Prompts）绕过这些防御 。这篇论文的核心思路是：利用知识编辑技术，直接定位并擦除模型内部的“毒性区域”，从而实现更深层次的去毒

## 详细拆解
![alt text](image.png)
![alt text](image-1.png)

![alt text](image-2.png)

## 给定一个对抗性输入，模型分别输出安全回复序列和不安全回复序列 是怎么做到的
![alt text](image-3.png)

## 如何分别分别强迫它走 $Y_{safe}$ 的生成路径和 $Y_{unsafe}$ 的生成路
![alt text](image-4.png)

## 损失函数
![alt text](image-5.png)
![alt text](image-6.png)