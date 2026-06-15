const sharp = require('sharp');
const fs = require('fs');

sharp('assets/icon.svg')
  .resize(512, 512)
  .png()
  .toFile('assets/icon.png')
  .then(() => {
    console.log('Successfully generated assets/icon.png');
  })
  .catch(err => {
    console.error('Error generating icon:', err);
  });
