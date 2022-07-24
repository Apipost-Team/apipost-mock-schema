# 🚀 apipost-mock-schema

[![Package Quality](https://packagequality.com/shield/apipost-mock-schema.svg)](https://packagequality.com/#?package=apipost-mock-schema)

Simple utility to mock example objects based on JSON schema definitions

## Features

Minimal & deterministic. Predictable single example with no randomisation involved

TypeScript types included

Supports $ref pointers

Thoroughly tested feature set

Supports example, default

Supports anyOf, allOf, oneOf

Built-in examples for following string formats:

 - email 
 - hostname 
 - ipv4 
 - ipv6 
 - uri 
 - uri-reference 
 - uri-template 
 - json-pointer
 - date-time 
 - uuid


## Install

```
$ npm install apipost-mock-schema
```

##  Usage
```javascript
const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: {
        type: 'integer',
        minimum: 1,
      },
      name: {
        type: 'string',
        example: 'John Doe',
      },
      email: {
        type: 'string',
        format: 'email',
      },
    },
  },
};
const MockSchema = require('apipost-mock-schema');
const myMockSchema = new MockSchema();

myMockSchema.mock(schema).then(res => {
    console.log(res)
    
    // will return
    /*
    [
        {
            "id": 7156472017141059,
            "name": "John Doe",
            "email": "y.hbm@tsqxod.dm"
        }
    ]
    */
}).catch(err => {
    console.log(err)
})
```
