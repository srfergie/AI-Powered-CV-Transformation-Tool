# 🤖 OpenRouter Model Options for CV Processing

## 🎯 **Current Configuration**
- **Model**: `openai/gpt-4-turbo`
- **Context**: 128K tokens
- **Cost**: Higher accuracy, more expensive
- **Best for**: Large documents, complex CVs, maximum accuracy

## 📋 **Alternative Models by Use Case**

### 💰 **Budget-Friendly Options**

#### **1. Claude 3 Haiku**
```js
model: 'anthropic/claude-3-haiku'
```
- **Context**: 200K tokens
- **Cost**: Very affordable
- **Speed**: Very fast
- **Best for**: Simple CVs, high volume processing

#### **2. GPT-3.5 Turbo 16K**
```js
model: 'openai/gpt-3.5-turbo-16k'
```
- **Context**: 16K tokens (with chunking support)
- **Cost**: Most affordable
- **Speed**: Fast
- **Best for**: Small to medium CVs

### ⚡ **High Performance Options**

#### **1. Claude 3 Sonnet** (Recommended)
```js
model: 'anthropic/claude-3-sonnet'
```
- **Context**: 200K tokens
- **Cost**: Moderate
- **Accuracy**: Excellent
- **Best for**: Balance of cost and performance

#### **2. GPT-4 Turbo** (Current)
```js
model: 'openai/gpt-4-turbo'
```
- **Context**: 128K tokens
- **Cost**: Higher
- **Accuracy**: Excellent
- **Best for**: Maximum accuracy, complex documents

#### **3. Claude 3 Opus**
```js
model: 'anthropic/claude-3-opus'
```
- **Context**: 200K tokens
- **Cost**: Highest
- **Accuracy**: Maximum
- **Best for**: Critical applications, complex analysis

### 🚀 **Large Document Specialists**

#### **1. Gemini Pro 1.5**
```js
model: 'google/gemini-pro-1.5'
```
- **Context**: 1M+ tokens
- **Cost**: Moderate
- **Best for**: Extremely large documents

#### **2. Claude 3 Haiku**
```js
model: 'anthropic/claude-3-haiku'
```
- **Context**: 200K tokens
- **Cost**: Low
- **Best for**: Large docs on a budget

## 🔧 **How to Change Model**

### **Method 1: Edit Configuration File**
1. Open `src/services/openRouterService.js`
2. Find line with `model: 'openai/gpt-4-turbo'`
3. Replace with your chosen model:
   ```js
   model: 'anthropic/claude-3-sonnet'  // Example change
   ```

### **Method 2: Environment Variable** (Recommended)
1. Add to your `.env` file:
   ```
   OPENROUTER_MODEL=anthropic/claude-3-sonnet
   ```
2. Update the service to use environment variable:
   ```js
   model: process.env.OPENROUTER_MODEL || 'openai/gpt-4-turbo'
   ```

## 📊 **Model Comparison Table**

| Model | Context | Cost | Speed | Accuracy | Best For |
|-------|---------|------|-------|----------|----------|
| GPT-3.5 Turbo | 16K | 💰 | ⚡⚡⚡ | ⭐⭐⭐ | Small CVs |
| Claude 3 Haiku | 200K | 💰💰 | ⚡⚡⚡ | ⭐⭐⭐⭐ | Budget + Large docs |
| Claude 3 Sonnet | 200K | 💰💰💰 | ⚡⚡ | ⭐⭐⭐⭐⭐ | **Recommended** |
| GPT-4 Turbo | 128K | 💰💰💰💰 | ⚡ | ⭐⭐⭐⭐⭐ | Maximum accuracy |
| Claude 3 Opus | 200K | 💰💰💰💰💰 | ⚡ | ⭐⭐⭐⭐⭐ | Critical apps |
| Gemini Pro 1.5 | 1M+ | 💰💰💰 | ⚡⚡ | ⭐⭐⭐⭐ | Massive documents |

## 🎯 **Recommendations by Use Case**

### **For Most Users** (Recommended)
```js
model: 'anthropic/claude-3-sonnet'
```
- Best balance of cost, speed, and accuracy
- 200K token context handles large documents
- Excellent at structured data extraction

### **For Budget-Conscious Users**
```js
model: 'anthropic/claude-3-haiku'
```
- Lowest cost with good performance
- Large context window
- Fast processing

### **For Maximum Accuracy**
```js
model: 'openai/gpt-4-turbo'  // Current setting
```
- Highest accuracy for complex CVs
- Best for critical applications
- Higher cost but best results

### **For Extremely Large Documents**
```js
model: 'google/gemini-pro-1.5'
```
- 1M+ token context
- Can handle massive documents without chunking
- Good balance of cost and capability

## 🔄 **Testing Different Models**

1. **Start with Claude 3 Sonnet** (best balance)
2. **If budget is tight**: Switch to Claude 3 Haiku
3. **If accuracy is critical**: Use GPT-4 Turbo (current)
4. **If documents are huge**: Try Gemini Pro 1.5

## 💡 **Pro Tips**

- **Test with your typical CV types** to find the best model
- **Monitor costs** in OpenRouter dashboard
- **Use environment variables** for easy model switching
- **Claude models often perform better** at structured extraction tasks
- **GPT-4 Turbo is best** for complex reasoning and analysis 