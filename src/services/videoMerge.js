const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const MERGE_DIR = path.join(__dirname, '..', '..', 'uploads', 'merged');

const mergeVideos = (inputPaths) => {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(MERGE_DIR, `merged_${uuidv4()}.mp4`);
    const listFile = path.join(MERGE_DIR, `list_${Date.now()}.txt`);

    // Create concat list file
    const listContent = inputPaths.map((p) => `file '${p}'`).join('\n');
    fs.writeFileSync(listFile, listContent);

    ffmpeg()
      .input(listFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .output(outputFile)
      .on('end', () => {
        fs.unlinkSync(listFile);
        resolve(outputFile);
      })
      .on('error', (err) => {
        if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
        reject(err);
      })
      .run();
  });
};

module.exports = { mergeVideos };
