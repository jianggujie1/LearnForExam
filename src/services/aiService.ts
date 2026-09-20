import { CourseSet, AISettings } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const AI_SYSTEM_PROMPT = `你是一位顶级的期末复习教研专家。请将学生的期末复习笔记提炼为 3~5 个核心考点主题模块，并生成高质量复习闪卡与客观题（单选和挖空题）。

规则：
1. **聚合分类**：归纳为 3~5 个核心主题模块。
2. **严格锚定**：所有卡片/题目必须附带 quoteSource（笔记原句引用）。
3. **支持 LaTeX**：公式必须用 $...$ (行内) 或 $$...$$ (独立行)。
4. **精炼输出**：每个主题输出 2~3 张闪卡与 2 道客观题，重在精准覆盖核心考点。
5. **必须且仅输出标准 JSON**，不要包裹多余的闲聊文字。`;

export const AI_USER_PROMPT_TEMPLATE = (rawNote: string, courseTitle: string) => `
课程名称: ${courseTitle || "期末复习笔记"}

【学生原始笔记】:
${rawNote.slice(0, 15000)}

请按如下 JSON 结构返回整理结果：
{
  "title": "${courseTitle || "期末复习专题"}",
  "topics": [
    {
      "id": "topic-1",
      "title": "主题模块名称（如：第一章 极限与连续性基础）",
      "summary": "本模块核心考点简述",
      "order": 1,
      "flashcards": [
        {
          "id": "fc-1",
          "front": "概念或问题（支持 $LaTeX$）",
          "back": "核心要点或公式解答",
          "quoteSource": "笔记原文片段",
          "mastery": "unseen"
        }
      ],
      "quizzes": [
        {
          "id": "qz-1",
          "type": "single_choice",
          "prompt": "单选题题干（支持 $LaTeX$）",
          "options": ["选项A", "选项B", "选项C", "选项D"],
          "correctAnswer": 0,
          "explanation": "解析及为什么选此项",
          "quoteSource": "笔记原文片段"
        },
        {
          "id": "qz-2",
          "type": "cloze",
          "prompt": "填空题指引",
          "clozeTemplate": "牛顿第二定律公式为 $F = $ {blank}。",
          "correctAnswer": "ma",
          "explanation": "解析",
          "quoteSource": "笔记原文片段"
        }
      ]
    }
  ]
}
`;

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'deepseek',
  apiKey: '',
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat'
};

export async function testConnection(settings: AISettings): Promise<string> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    return '未配置 API Key，将使用内置 Demo 模式';
  }

  const baseUrl = (settings.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = settings.model || 'deepseek-chat';
  const targetUrl = `${baseUrl}/chat/completions`;

  const requestPayload = {
    model: model,
    messages: [
      { role: 'user', content: '请回复一个字：好' }
    ],
  };

  try {
    const rawResult = await invoke<string>('send_ai_chat_stream', {
      url: targetUrl,
      apiKey: apiKey,
      request: requestPayload,
    });
    return `连接成功！AI 响应正常: "${rawResult.trim().slice(0, 50)}"`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`连接测试失败: ${msg}`);
  }
}

export async function generateCourseSetFromNote(
  rawNote: string,
  courseTitle: string,
  settings: AISettings,
  onStreamChunk?: (chunk: string) => void
): Promise<CourseSet> {
  const apiKey = settings.apiKey.trim();
  const baseUrl = (settings.baseUrl || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
  const model = settings.model || 'deepseek-chat';

  // If no API key is provided, use mock data
  if (!apiKey) {
    return generateMockCourseSet(rawNote, courseTitle);
  }

  const targetUrl = `${baseUrl}/chat/completions`;
  const requestPayload = {
    model: model,
    temperature: 0.3,
    messages: [
      { role: 'system', content: AI_SYSTEM_PROMPT },
      { role: 'user', content: AI_USER_PROMPT_TEMPLATE(rawNote, courseTitle) },
    ],
  };

  // Set up event listener for real-time streaming chunks
  let unlisten: (() => void) | null = null;
  if (onStreamChunk) {
    try {
      unlisten = await listen<string>('ai-stream-chunk', (event) => {
        onStreamChunk(event.payload);
      });
    } catch (e) {
      console.warn('Tauri event listen not available', e);
    }
  }

  let contentStr = '';

  try {
    contentStr = await invoke<string>('send_ai_chat_stream', {
      url: targetUrl,
      apiKey: apiKey,
      request: requestPayload,
    });
  } catch (err: unknown) {
    const errDetail = err instanceof Error ? err.message : String(err);
    throw new Error(`AI 请求失败: ${errDetail}`);
  } finally {
    if (unlisten) {
      unlisten();
    }
  }

  if (!contentStr) {
    throw new Error('AI 返回内容为空，请检查模型额度或配置');
  }

  // Handle markdown code fences ```json ... ```
  let cleanJsonStr = contentStr.trim();
  const jsonMatch = cleanJsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    cleanJsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleanJsonStr);
    const courseId = `course-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const topics = (parsed.topics || []).map((t: any, tIdx: number) => {
      const topicId = `${courseId}-topic-${tIdx + 1}`;
      return {
        ...t,
        id: topicId,
        courseId,
        flashcards: (t.flashcards || []).map((f: any, fIdx: number) => ({
          ...f,
          id: `${courseId}-fc-${tIdx + 1}-${fIdx + 1}`,
          topicId,
          courseId,
        })),
        quizzes: (t.quizzes || []).map((q: any, qIdx: number) => ({
          ...q,
          id: `${courseId}-qz-${tIdx + 1}-${qIdx + 1}`,
          topicId,
          courseId,
        })),
      };
    });
    return {
      id: courseId,
      title: parsed.title || courseTitle || '期末复习专题',
      rawNote,
      createdAt: Date.now(),
      topics,
    };
  } catch (parseErr) {
    console.error('Failed to parse AI output:', cleanJsonStr);
    throw new Error('AI 返回的格式无法被完整解析为 JSON，可能是模型中断输出，建议重试');
  }
}

function generateMockCourseSet(rawNote: string, courseTitle: string): CourseSet {
  const courseId = `course-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const topic1Id = `${courseId}-topic-1`;
  const topic2Id = `${courseId}-topic-2`;
  return {
    id: courseId,
    title: courseTitle || "高等数学与物理基础 (演示模式)",
    rawNote,
    createdAt: Date.now(),
    topics: [
      {
        id: topic1Id,
        title: "微积分基础与极限计算",
        summary: "涵盖重要极限公式、等价无穷小代换及洛必达法则使用条件。",
        order: 1,
        flashcards: [
          {
            id: `${courseId}-fc-1-1`,
            topicId: topic1Id,
            courseId,
            front: "第一个重要极限公式是什么？其几何意义？",
            back: "$\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$。表明在零点附近，正弦函数与自变量具有等价无穷小的线性逼近性质。",
            quoteSource: "第一重要极限：lim(x->0) sinx/x = 1，考前必背",
            mastery: "unseen"
          },
          {
            id: `${courseId}-fc-1-2`,
            topicId: topic1Id,
            courseId,
            front: "常用等价无穷小代换公式（当 $x \\to 0$ 时）",
            back: "1. $\\sin x \\sim x$\n2. $\\tan x \\sim x$\n3. $e^x - 1 \\sim x$\n4. $1 - \\cos x \\sim \\frac{1}{2}x^2$",
            quoteSource: "1-cosx 经常忘记乘 1/2，易错点！",
            mastery: "unseen"
          }
        ],
        quizzes: [
          {
            id: `${courseId}-qz-1-1`,
            topicId: topic1Id,
            courseId,
            type: "single_choice",
            prompt: "当 $x \\to 0$ 时，下列与 $x^2$ 是等价无穷小的是：",
            options: [
              "$1 - \\cos x$",
              "$2(1 - \\cos x)$",
              "$\\sin(x^2) + x$",
              "$e^{x^2} - x$"
            ],
            correctAnswer: 1,
            explanation: "因为 $1 - \\cos x \\sim \\frac{1}{2}x^2$，所以 $2(1 - \\cos x) \\sim 2 \\cdot \\frac{1}{2}x^2 = x^2$。",
            quoteSource: "1-cosx 等价于 0.5 x^2"
          },
          {
            id: `${courseId}-qz-1-2`,
            topicId: topic1Id,
            courseId,
            type: "cloze",
            prompt: "完成洛必达法则使用前提条件",
            clozeTemplate: "洛必达法则仅适用于 {blank} 型或 $\\frac{\\infty}{\\infty}$ 型未定式求极限。",
            correctAnswer: "0/0",
            explanation: "只有未定式形式才能直接上下求导，若分母不趋于零则不可乱用。",
            quoteSource: "洛必达法则前提：必须是 0/0 或 inf/inf 才能用！"
          }
        ]
      },
      {
        id: topic2Id,
        title: "经典力学与动力学基本方程",
        summary: "牛顿第二定律、动量守恒与机械能守恒条件。",
        order: 2,
        flashcards: [
          {
            id: `${courseId}-fc-2-1`,
            topicId: topic2Id,
            courseId,
            front: "质点系动量守恒定律的充要条件是什么？",
            back: "系统所受**合外力为零**（$\\sum \\vec{F}_{\\text{ext}} = 0$）。内力不改变系统总动量。",
            quoteSource: "动量守恒：系统合外力等于0，内力无论多大都不影响总动量。",
            mastery: "unseen"
          }
        ],
        quizzes: [
          {
            id: `${courseId}-qz-2-1`,
            topicId: topic2Id,
            courseId,
            type: "single_choice",
            prompt: "关于机械能守恒定律，下列说法正确的是：",
            options: [
              "只要合外力做功为零，机械能就守恒",
              "只有保守内力做功时，系统机械能守恒",
              "只要有摩擦力存在，机械能必然不守恒",
              "重力势能与动能之和永远恒定"
            ],
            correctAnswer: 1,
            explanation: "机械能守恒的条件是除重力/弹力等保守内力外，没有其他非保守力做功。",
            quoteSource: "机械能守恒条件：只有保守力做功，外力不做功或代数和为0。"
          }
        ]
      }
    ]
  };
}
