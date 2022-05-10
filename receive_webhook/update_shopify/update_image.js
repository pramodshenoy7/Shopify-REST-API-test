const Shopify = require('shopify-api-node')
const shopify = new Shopify({
  shopName: process.env.SHOPIFY_SHOP,
  apiKey: process.env.SHOPIFY_USER,
  password: process.env.SHOPIFY_PASSW,
})
var AWS = require('aws-sdk')
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' })
var cld_cloud = process.env.CLD_CLOUD

exports.handler = async (event, context, callback) => {
  var queueURL = process.env.SQS_QUEUE_URL
  var receiptHandle = event.Records[0].receiptHandle
  var body = JSON.parse(event.Records[0].body)
  var pub_id = Object.keys(body.resources)[0]
  var new_metadata = body.resources[pub_id].new_metadata
  try {
    await update_is_main(new_metadata['product-identifier'], pub_id)
    // Delete message from SQS
    var deleteParams = {
      QueueUrl: queueURL,
      ReceiptHandle: receiptHandle,
    }
    sqs.deleteMessage(deleteParams, function (err, data) {
      if (err) {
        console.log('Delete Error', err)
      } else {
        console.log('Message Deleted', data)
      }
    })
  } catch (err) {
    console.log(err)
  }
}

async function update_is_main(handle, pub_id) {
  try {
    // Get Product by Handle
    const prod = await shopify.product.list({ handle: handle })
    const prod_id = prod[0].id
    // List all Product Images for the Product
    const prod_images = await shopify.productImage.list(prod_id)
    if (prod_images.length == 0) {
      //no Product Images. Create a new Product Image.
      var create_image = await shopify.productImage.create(prod_id, {
        src:
          'https://res.cloudinary.com/' +
          cld_cloud +
          '/image/upload/' +
          pub_id +
          '.jpg',
        position: 1,
      })
    } else {
      // delete shopify main image and add the new one
      var prod_img_main
      prod_images.forEach((img) => {
        if (img.position == 1) {
          prod_img_main = img.id
        }
      })
      var delete_image = await shopify.productImage.delete(
        prod_id,
        prod_img_main,
      )
      var create_image = await shopify.productImage.create(prod_id, {
        src:
          'https://res.cloudinary.com/' +
          cld_cloud +
          '/image/upload/' +
          pub_id +
          '.jpg',
        position: 1,
      })
    }
  } catch (e) {
    console.log(e)
  }
}
