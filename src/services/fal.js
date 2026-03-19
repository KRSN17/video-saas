const { fal } = require('@fal-ai/client');

fal.config({ credentials: process.env.FAL_KEY });

const MODELS = {
  'kling-text': 'fal-ai/kling-video/v2/master/text-to-video',
  'kling-image': 'fal-ai/kling-video/v2/master/image-to-video',
  'minimax-text': 'fal-ai/minimax/video-01/text-to-video',
  'wan-text': 'fal-ai/wan/v2.1/text-to-video',
};

const getModelId = (shortName) => MODELS[shortName] || shortName;

const submitTextToVideo = async (prompt, modelKey = 'kling-text', options = {}) => {
  const modelId = getModelId(modelKey);
  const result = await fal.queue.submit(modelId, {
    input: {
      prompt,
      duration: options.duration || '5',
      aspect_ratio: options.aspectRatio || '16:9',
      ...options.extra,
    },
  });
  return { requestId: result.request_id, modelId };
};

const submitImageToVideo = async (imageUrl, prompt, modelKey = 'kling-image', options = {}) => {
  const modelId = getModelId(modelKey);
  const result = await fal.queue.submit(modelId, {
    input: {
      prompt,
      image_url: imageUrl,
      duration: options.duration || '5',
      ...options.extra,
    },
  });
  return { requestId: result.request_id, modelId };
};

const checkStatus = async (modelId, requestId) => {
  const status = await fal.queue.status(modelId, { requestId, logs: true });
  return status;
};

const getResult = async (modelId, requestId) => {
  const result = await fal.queue.result(modelId, { requestId });
  return result;
};

module.exports = { submitTextToVideo, submitImageToVideo, checkStatus, getResult, MODELS, getModelId };
