const S3 = require('aws-sdk/clients/s3');
const fs = require('fs');

var bucketName = process.env.AWS_BUCKET_NAME
var region = process.env.AWS_BUCKET_REGION
var accessKeyId = process.env.AWS_ACCESS_KEY
var secretAccessKey = process.env.AWS_SECRET_KEY

const s3 = new S3({
    region,
    accessKeyId,
    secretAccessKey
  })

//code from 
//https://github.com/Sam-Meech-Ward/image-upload-s3/blob/430d984e6c637128a010f792c0f88aaec334fb5f/backend/s3.js#L32
// downloads a file from s3
function getFileStream(fileKey) {
    const downloadParams = {
      Key: fileKey,
      Bucket: bucketName
    }
  
    return s3.getObject(downloadParams).createReadStream()
  }
  exports.getFileStream = getFileStream