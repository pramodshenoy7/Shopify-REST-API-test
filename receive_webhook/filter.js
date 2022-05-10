var AWS = require('aws-sdk')
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' })
exports.handler = async (event, context, callback) => {
  event = JSON.parse(event.body)
  if (event.notification_type == 'resource_metadata_changed') {
    var pub_id = Object.keys(event.resources)[0]
    var previous_metadata = event.resources[pub_id].previous_metadata
    var new_metadata = event.resources[pub_id].new_metadata
    if (
      previous_metadata['is-main'] != new_metadata['is-main'] &&
      new_metadata['is-main'] == 'True' &&
      new_metadata['view-type'] != 'swatch'
    ) {
      var params = {
        MessageBody: JSON.stringify(event),
        MessageDeduplicationId: new Date().valueOf().toString(),
        MessageGroupId: 'Shopify-prod-update',
        QueueUrl: process.env.SQS_QUEUE_URL,
      }
      console.log(params)
      try {
        var sqs_res = await sqs.sendMessage(params).promise()
        console.log(sqs_res)
      } catch (err) {
        console.log('Await error:' + err)
      }
    }
  }
  return {
    statusCode: 200,
    body: JSON.stringify(
      { message: 'Webhook received', input: event },
      null,
      2,
    ),
  }
}
