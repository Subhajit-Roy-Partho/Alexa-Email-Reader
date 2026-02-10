const AWS = require('aws-sdk');
const config = require('./config');

const documentClient = new AWS.DynamoDB.DocumentClient({
  region: config.awsRegion,
  convertEmptyValues: true
});

module.exports = {
  documentClient
};
