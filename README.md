# Tutorial: Using AWS Lambda with Amazon S3

Thit tutorial will teach you how to optimize images that are uploaded dinamically to a website.

What you will learn at the end of this tutorial is how to execute a Lambda Function once an object is uploaded to an S3 bucket.

If you want to learn why you should care about image optimizations I encourage you to visit [web.dev](web.dev), especially [Fast load times](https://web.dev/fast).

## Architecture

![Architecture overview](/assets/architecture_overview.jpg)

S3 Bucket structure will be the following:

\- prefix-gallery
&nbsp;&nbsp;&nbsp;|--- /original &#13; &#10;
&nbsp;&nbsp;&nbsp;|---&nbsp;&nbsp;| --- /image.jpg &#13; &#10;
&nbsp;&nbsp;&nbsp;|--- /thumbs &#13; &#10;
&nbsp;&nbsp;&nbsp;|---&nbsp;&nbsp;| --- /image_original.jpg &#13; &#10;
&nbsp;&nbsp;&nbsp;|---&nbsp;&nbsp;| --- /image_thumb_1200.jpg &#13; &#10;
&nbsp;&nbsp;&nbsp;|---&nbsp;&nbsp;| --- /image_thumb_640.jpg &#13; &#10;
&nbsp;&nbsp;&nbsp;|---&nbsp;&nbsp;| --- /image_thumb_420.jpg &#13; &#10;

### Workflow

1. User uploads an image to `/original` folder. This upload process could be through an application different than AWS Console.
2. S3 triggers a Lambda Function with an event as parameter with information about what happened.
3. Lambda Function downloads uploaded image from S3.
4. Lambda Function resize and compress image to generate 4 new images.
5. Lambda Function upload optimized images to `/thumbs` folder.

## S3

Let's create an S3 bucket. You can do this though the console or using the AWS CLI. named it `{prefix}-gallery`. Replace prefix with a unique identifier so that S3 name is [globally unique](https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html). I'll use `rtalexk-gallery`, as my username.

### Console

```bash
(bash)$ aws s3 mb s3://rtalexk-gallery
output: make_bucket: rtalexk-gallery
```

You can list your buckets to make sure it was created successfuly:

```bash
(bash)$ aws s3 ls
output: 2019-08-13 10:53:34 rtalexk-gallery
```

## Execution role

Now you have to create an execution role that grants Lambda Function perform operations over S3 resources and to create logs in AWS CloudWatch.

First let's create a trust policy document where we specify the trust relationship between Lambda service and STS so that our Lambda Function is able to assume its execution role. You can create this JSON fule with any program you want, I'll use vim:

```bash
(bash) $ vim trust-policy.json
```

And enter the folowwing JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
````

And now we can create the role:

```bash
(bash) $ aws iam create-role --role-name role-lambda-s3 --assume-role-policy-document file://trust-policy.json
```

Output:
```json
{
    "Role": {
        "AssumeRolePolicyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "lambda.amazonaws.com"
                    }
                }
            ]
        },
        "RoleId": "AROAWLOEJBDOVF57FGKGJ",
        "CreateDate": "2019-08-13T16:44:30Z",
        "RoleName": "role-lambda-s3",
        "Path": "/",
        "Arn": "arn:aws:iam::123456789123:role/role-lambda-s3"
    }
}
```

Now let's attach permissions to the role:

```bash
(bash) $ aws iam attach-role-policy --role-name role-lambda-s3 --policy-arn "arn:aws:iam::aws:policy/AWSLambdaExecute"
```

We can confirm that the policy was attached successfuly:

```bash
(bash) $ aws iam list-attached-role-policies --role-name role-lambda-s3
```

Output:

```json
{
    "AttachedPolicies": [
        {
            "PolicyName": "AWSLambdaExecute",
            "PolicyArn": "arn:aws:iam::aws:policy/AWSLambdaExecute"
        }
    ]
}
```

## Lambda Function

Now it's time to create a Lambda Function and attach the role which grants permission to perform read and write operations over S3, but before that, we must to either upload the code directly with the function creation or store the code in S3 and reference from the Lambda function. I'll use the second approach.

To do that, clone this repo in your own computer and place inside the `function` directory, then execute the following command:

```bash
npm run pack
```

This command will install dependencies for the function and generate a zip file. This zip file will be uploaded to S3, we can reuse the same bucket to store the code:

```bash
(bash) $ aws s3 cp code.zip s3://rtalexk-gallery/code.zip
output: upload: ./code.zip to s3://rtalexk-gallery/code.zip
```

Now we can create the function and reference the code from S3:

```bash
(bash) $ aws lambda create-function --function-name imageProcessing --runtime nodejs10.x \
      --role arn:aws:iam::123456789123:role/role-lambda-s3 --handler index.handler \
      --code S3Bucket=rtalexk-gallery,S3Key=code.zip --timeout 60 --memory-size 512
```

### Parameter description

* `--function-name`: name of the function.
* `--runtime` Engine used to execute the code, we are using node.js as programming languaje.
* `--role`: assign a role to the function, it is the previously created role with read/write permissions over S3.
* `--handler`: file and exported function that Lambda will execute.
* `--code`: reference to the code stored in S3.
* `--timeout`: Timeout in seconds after the function will be stoped.
* `--memory-size`: Memory and Compute capacity in MB reserved for the function.

Output:

```json
{
    "TracingConfig": {
        "Mode": "PassThrough"
    },
    "CodeSha256": "jz9MRd5XnUBqMdqncN7d7Fxg+edH2ctkqPbMFTteNmU=",
    "FunctionName": "imageProcessing",
    "CodeSize": 49657600,
    "RevisionId": "293ca655-251f-4400-a13b-fc2241c5ea23",
    "MemorySize": 512,
    "FunctionArn": "arn:aws:lambda:us-east-1:123456789123:function:imageProcessing",
    "Version": "$LATEST",
    "Role": "arn:aws:iam::123456789123:role/role-lambda-s3",
    "Timeout": 60,
    "LastModified": "2019-08-13T17:10:23.926+0000",
    "Handler": "index.handler",
    "Runtime": "nodejs10.x",
    "Description": ""
}
```

### Configure trigger to execute the function

This step is easier within the Console. From the Lambda console, select `Add trigger` button in the function `Designer` section and select S3, select the bucket and add `original/` as prefix. But, we'll do this using the CLI.

To achieve this, we'll require to perform two actions:

1) Add permissions to the Lambda Function to be executed by S3,
2) Add notification configuration to the S3 bucket so that when an object is created, it performs an action, which is the function execution.

