const { fal } = require('@fal-ai/client');
const prisma = require('../config/database');

// Default config with env key
fal.config({ credentials: process.env.FAL_KEY });

const MODELS = {
  'kling-text': 'fal-ai/kling-video/v2/master/text-to-video',
  'kling-image': 'fal-ai/kling-video/v2/master/image-to-video',
  'minimax-text': 'fal-ai/minimax/video-01/text-to-video',
  'wan-text': 'fal-ai/wan/v2.1/text-to-video',
  'runway-gen4': 'fal-ai/runway-gen4/turbo/image-to-video',
  'luma-ray2': 'fal-ai/luma-dream-machine/ray-2',
  'hunyuan': 'fal-ai/hunyuan-video',
  'ltx-video': 'fal-ai/ltx-video/v0.9.1',
  'veo2': 'fal-ai/veo2',
};

const MODEL_INFO = {
  'kling-text': { name: 'Kling V2', type: 'text-to-video', credits: 2, maxDuration: '10s', quality: 'High' },
  'kling-image': { name: 'Kling V2', type: 'image-to-video', credits: 2, maxDuration: '10s', quality: 'High' },
  'minimax-text': { name: 'MiniMax Video', type: 'text-to-video', credits: 1, maxDuration: '6s', quality: 'Medium' },
  'wan-text': { name: 'Wan 2.1', type: 'text-to-video', credits: 1, maxDuration: '5s', quality: 'Medium' },
  'runway-gen4': { name: 'Runway Gen-4', type: 'image-to-video', credits: 3, maxDuration: '10s', quality: 'Premium' },
  'luma-ray2': { name: 'Luma Ray 2', type: 'text-to-video', credits: 2, maxDuration: '5s', quality: 'High' },
  'hunyuan': { name: 'Hunyuan', type: 'text-to-video', credits: 1, maxDuration: '5s', quality: 'Medium' },
  'ltx-video': { name: 'LTX Video', type: 'text-to-video', credits: 1, maxDuration: '5s', quality: 'Fast' },
  'veo2': { name: 'Veo 2', type: 'text-to-video', credits: 3, maxDuration: '8s', quality: 'Premium' },
};

const getModelId = (shortName) => MODELS[shortName] || shortName;

/**
 * Fetch the active API key with the lowest usage count.
 * Falls back to env FAL_KEY if no DB keys exist.
 */
const getNextApiKey = async () => {
  const apiKey = await prisma.apiKey.findFirst({
    where: { active: true, provider: 'fal' },
    orderBy: { usageCount: 'asc' },
  });
  return apiKey;
};

const configureKey = (keyValue) => {
  fal.config({ credentials: keyValue });
};

const recordKeyUsage = async (keyId) => {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: {
      usageCount: { increment: 1 },
      lastUsed: new Date(),
    },
  });
};

const markKeyInactive = async (keyId) => {
  await prisma.apiKey.update({
    where: { id: keyId },
    data: { active: false },
  });
};

/**
 * Execute a fal API call with key rotation and error handling.
 * Tries DB keys first (lowest usage), falls back to env key.
 */
const withKeyRotation = async (fn) => {
  // Try DB keys
  const triedKeyIds = new Set();

  while (true) {
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        active: true,
        provider: 'fal',
        id: { notIn: Array.from(triedKeyIds) },
      },
      orderBy: { usageCount: 'asc' },
    });

    if (!apiKey) break;

    triedKeyIds.add(apiKey.id);
    configureKey(apiKey.key);

    try {
      const result = await fn();
      await recordKeyUsage(apiKey.id);
      return result;
    } catch (err) {
      console.error(`API key ${apiKey.id} failed: ${err.message}. Marking inactive.`);
      await markKeyInactive(apiKey.id);
      // continue to next key
    }
  }

  // Fall back to env key
  if (process.env.FAL_KEY) {
    configureKey(process.env.FAL_KEY);
    return await fn();
  }

  throw new Error('No working API keys available');
};

const submitTextToVideo = async (prompt, modelKey = 'kling-text', options = {}) => {
  const modelId = getModelId(modelKey);
  return withKeyRotation(async () => {
    const result = await fal.queue.submit(modelId, {
      input: {
        prompt,
        duration: options.duration || '5',
        aspect_ratio: options.aspectRatio || '16:9',
        ...options.extra,
      },
    });
    return { requestId: result.request_id, modelId };
  });
};

const submitImageToVideo = async (imageUrl, prompt, modelKey = 'kling-image', options = {}) => {
  const modelId = getModelId(modelKey);
  return withKeyRotation(async () => {
    const result = await fal.queue.submit(modelId, {
      input: {
        prompt,
        image_url: imageUrl,
        duration: options.duration || '5',
        ...options.extra,
      },
    });
    return { requestId: result.request_id, modelId };
  });
};

const checkStatus = async (modelId, requestId) => {
  const status = await fal.queue.status(modelId, { requestId, logs: true });
  return status;
};

const getResult = async (modelId, requestId) => {
  const result = await fal.queue.result(modelId, { requestId });
  return result;
};

module.exports = { submitTextToVideo, submitImageToVideo, checkStatus, getResult, MODELS, MODEL_INFO, getModelId };
