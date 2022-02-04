const AWS = require("aws-sdk");
const util = require("util");
const sharp = require("sharp");

const s3 = new AWS.S3();

const THUMBNAIL_WIDTH = 500;
const MEDIUM_WIDTH = 900;

exports.handler = async (event, context, callback) => {
	console.log("Reading options from event:\n", util.inspect(event, { depth: 5 }));
	const srcBucket = event.Records[0].s3.bucket.name;
	// Object key may have spaces or unicode non-ASCII characters -use decode URIComponent
	const srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));
	const dstBucket = srcBucket + "-resized";

	const typeMatch = srcKey.match(/\.([^.]*)$/);

	if (!typeMatch) {
		console.log("Could not determine the image type.");
		return;
	}

	// Check that the image type is supported
	const imageType = typeMatch[1].toLowerCase();
	if (imageType != "jpg" && imageType != "png") {
		console.log(`Unsupported image type: ${imageType}`);
		return;
	}

	const oriImageParams = {
		Bucket: srcBucket,
		Key: srcKey,
	};

	// Download the image from the S3 source bucket.
	const origimage = await s3
		.getObject(oriImageParams)
		.promise()
		.catch((e) => {
			console.log(e);
			return;
		});

	const thumbnailKey = srcKey.replace(typeMatch[0], "") + "_thumbnail" + typeMatch[0];
	const mediumKey = srcKey.replace(typeMatch[0], "") + "_medium" + typeMatch[0];

	//height will automatically adjust according to aspect ratio.
	const thumbnailBuffer = await sharp(origimage.Body)
		.resize(THUMBNAIL_WIDTH)
		.toBuffer()
		.catch((e) => {
			console.log(e);
			return;
		});

	const mediumBuffer = await sharp(origimage.Body)
		.resize(MEDIUM_WIDTH)
		.toBuffer()
		.catch((e) => {
			console.log(e);
			return;
		});

	// Upload the thumbnail image to the destination bucket
	try {
		const thumnailDestParamas = {
			Bucket: dstBucket,
			Key: thumbnailKey,
			Body: thumbnailBuffer,
			ContentType: "image",
		};

		const thumnailPutResult = await s3.putObject(thumnailDestParamas).promise();

		const mediumDestParams = {
			Bucket: dstBucket,
			Key: mediumKey,
			Body: mediumBuffer,
			ContentType: "image",
		};

		const mediumPutResult = await s3.putObject(mediumDestParams).promise();
	} catch (error) {
		console.log(error);
		return;
	}
};
