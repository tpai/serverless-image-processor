# Lambda Image Processor

## Prerequisites

#### Install Dependencies

```
yarn
```

#### Initialize

```
yarn start
```

#### Test

Modify event.json

```
Records: [
    {
        s3: {
            object: {
                key: [IMAGE_NAME],
                ...
            },
            bucket: {
                name: [BUCKET_NAME],
                ...
            },
            ...
        },
        ...
    }
]
```

Run test command

```
yarn test
```
