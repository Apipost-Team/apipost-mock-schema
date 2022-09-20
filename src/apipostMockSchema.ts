const _ = require('lodash'),
    uuid = require('uuid'),
    $RefParser = require("@apidevtools/json-schema-ref-parser"),
    Mockjs = require('mockjs');

/**
 * 定义 MockSchema 类
 */
const MockSchema = function ApipostMockSchema(this: any) {
    // mock 一个jsonschema
    function mock(schema: any) {
        schema = _.cloneDeep(schema);
        return new Promise((resolve, reject) => {
            schema = resolveAllOf(schema)
            $RefParser.dereference(schema, (err: any, schema: any) => {
                if (err) {
                    reject({});
                }
                else {
                    try {
                        // 修正 schema 字段, 增加 mockField 字段
                        (function resolveSchemaFields(schema) {
                            if (_.isObject(schema.properties)) {
                                for (let field in schema.properties) {
                                    if (_.isObject(schema.properties[field].mock) && _.isString(schema.properties[field].mock.mock)) {
                                        schema.properties[field].mockField = schema.properties[field].mock.mock
                                    } else {
                                        schema.properties[field].mockField = `@${field}`
                                    }

                                    if (schema.properties && _.isObject(schema.properties[field])) {
                                        resolveSchemaFields(schema.properties[field]);
                                    }
                                }
                            } else {
                                if (schema.type === 'array' && _.isObject(schema.items)) {
                                    resolveSchemaFields(schema.items)
                                }
                            }
                        })(schema);

                        resolve(recursionJsonSchema(schema));
                    } catch (e: any) {
                        reject({});
                    }
                }
            })
        })
    }

    // 智能 mock
    // todo 后续支持更多用户自定义 mock
    function intelligentMockJs(mock: any) {
        return Mockjs.mock(String(mock))
    }

    // 递归设置参数mock值
    function recursionJsonSchema(schema: any): any {
        // schema type
        const type = _.isArray(schema) ? _.first(schema.type) : schema.type;

        // oneOf 类型 
        if (_.isArray(schema.oneOf)) {
            return recursionJsonSchema(schema.oneOf[_.random(0, schema.oneOf.length - 1)])
        }

        // anyOf 类型 
        if (_.isArray(schema.anyOf)) {
            return recursionJsonSchema(schema.anyOf[_.random(0, schema.anyOf.length - 1)])
        }

        // default
        if (!_.isUndefined(schema.default)) {
            switch (type) {
                case 'string':
                    return String(schema.default);
                    break;
                case 'number':
                case 'integer':
                    return Number(schema.default);
                    break;
                case 'boolean':
                    return Boolean(schema.default);
                    break;
            }
        }

        // example
        if (!_.isUndefined(schema.example)) {
            switch (type) {
                case 'string':
                    return String(schema.example);
                    break;
                case 'number':
                case 'integer':
                    return Number(schema.example);
                    break;
                case 'boolean':
                    return Boolean(schema.example);
                    break;
                default:
                    return schema.example;
                    break;
            }
        }

        // enum
        if (_.isArray(schema.enum)) {
            return schema.enum[_.random(0, schema.enum.length - 1)];
        }

        switch (type) {
            case 'null':
                return null;
                break;
            case 'boolean':
                return !_.random(0, 1);
                break;
            case 'object':
                if (!schema.hasOwnProperty('properties') || Object.keys(schema.properties).length == 0) {
                    return {};
                }

                return _.mapValues(schema.properties, recursionJsonSchema);
                break;
            case 'array':
                if (!schema.items) {
                    return [];
                }

                let items: any = [];
                let item: any = schema.items;

                if (_.isArray(item.anyOf)) {
                    items.push(recursionJsonSchema(item.anyOf[_.random(0, item.anyOf.length - 1)]));
                    // for (let option of item.anyOf) {
                    //     items.push(recursionJsonSchema(option));
                    // }
                }

                if (_.isArray(item.oneOf)) {
                    items.push(recursionJsonSchema(item.oneOf[_.random(0, item.oneOf.length - 1)]));
                }

                while (items.length < (schema.minItems || 1)) {
                    items.push(recursionJsonSchema(item));
                }

                return schema.maxItems ? _.take(items, schema.maxItems) : items;
                break;
            case 'string':
                if (_.isArray(schema.enum)) {
                    return schema.enum[_.random(0, schema.enum.length - 1)];
                } else {
                    let str: any = schema.default;

                    const minln: number = !_.isNil(schema.minLength) ? schema.minLength : 0;
                    const maxln: number = !_.isNil(schema.maxLength) ? schema.maxLength : _.isString(str) ? str.length : _.random(1, 36);

                    if (_.isString(schema.format)) {
                        const formatExample: any = {
                            email: intelligentMockJs(`@email()`),
                            hostname: 'apipost.cn',
                            ipv4: intelligentMockJs(`@ip()`),
                            ipv6: '2400:da00::dbf:0:100',
                            uri: 'https://echo.apipost.cn/get.php',
                            'uri-reference': '/path#anchor',
                            'uri-template': '/path/{param}',
                            'json-pointer': '/foo/bar',
                            'date-time': new Date('1970-01-01').toJSON(),
                            uuid: uuid.v4(),
                            _default: intelligentMockJs(`@ctitle(${minln}, ${maxln})`),
                        };

                        str = formatExample[schema.format] || formatExample._default;

                        if (str === formatExample._default && str.length < minln) {
                            return _.padEnd(str, minln, str);
                        }
                        return str.substr(0, _.clamp(str.length, minln, maxln));
                    } else {
                        if (!str) {
                            if (_.isString(schema.mockField)) {
                                let mockStr: any = intelligentMockJs(schema.mockField);

                                // fix bug
                                if (schema.mockField != '') {
                                    return String(mockStr);
                                } else {
                                    return intelligentMockJs('@ctitle');
                                }
                            } else {
                                return intelligentMockJs(`@ctitle(${minln}, ${maxln})`);
                            }
                        }
                    }
                }
                break;
            case 'number':
            case 'integer':
                const schemaMin: number = schema.minimum && schema.exclusiveMinimum ? schema.minimum + 1 : schema.minimum;
                const schemaMax: number = schema.maximum && schema.exclusiveMaximum ? schema.maximum - 1 : schema.maximum;
                let min: number = !_.isNil(schemaMin) ? schemaMin : Number.MIN_SAFE_INTEGER;
                let max: number = !_.isNil(schemaMax) ? schemaMax : Number.MAX_SAFE_INTEGER;

                if (schema.multipleOf) {
                    min = Math.ceil(min / schema.multipleOf) * schema.multipleOf;
                    max = Math.floor(max / schema.multipleOf) * schema.multipleOf;
                }

                if (_.isArray(schema.enum)) {
                    schema.enum.forEach((item: any) => {
                        if (_.inRange(item, min, max)) {
                            return Number(item);
                        }
                    })
                } else {
                    if (schema.mockField != '') {
                        try {
                            let mockNum = Number(intelligentMockJs(schema.mockField));

                            if (!_.isNaN(mockNum) && !_.isNil(mockNum)) {
                                return mockNum;
                            }
                        } catch (e) {
                            return Number(intelligentMockJs(`@integer(${min}, ${max})`))
                        }
                    }
                    return Number(intelligentMockJs(`@integer(${min}, ${max})`))
                }
                break;
            default:
                return {};
                break;
        }

        return schema;
    }

    // 修正 schema的 allOf 
    function resolveAllOf(schema: any) {
        if (schema.allOf && schema.allOf[0]) {
            schema = _.reduce(
                schema.allOf,
                (combined: any, subschema: any) => _.merge({}, combined, resolveAllOf(subschema)),
                schema,
            );
        }
        return schema;
    }

    // 对外暴漏 mock 方法
    Object.defineProperty(this, 'mock', {
        value: mock
    });

    // 对外暴漏 intelligentMockJs 方法
    Object.defineProperty(this, 'intelligentMockJs', {
        value: intelligentMockJs
    });
}

/**
 *  拓展mockjs， 定义一些内置 mock
 */
const _mockjsRandomExtend: any = {};

new Array('telephone', 'phone', 'mobile').forEach(func => {
    _mockjsRandomExtend[func] = function () {
        return this.pick(['131', '132', '137', '188']) + Mockjs.mock(/\d{8}/)
    };
})
new Array('username', 'user_name', 'nickname', 'nick_name').forEach(func => {
    _mockjsRandomExtend[func] = function () {
        return Mockjs.mock(`@cname`)
    };
})
new Array('avatar', 'icon', 'img', 'photo', 'pic').forEach(func => {
    _mockjsRandomExtend[func] = function () {
        return Mockjs.mock(`@image('400x400')`)
    };
})

new Array('description').forEach(func => {
    _mockjsRandomExtend[func] = function () {
        return Mockjs.mock(`@cparagraph`)
    };
})

new Array('id', 'userid', 'user_id', 'articleid', 'article_id').forEach(func => {
    _mockjsRandomExtend[func] = function () {
        return Mockjs.mock(`@integer(100, 1000)`)
    };
})

Mockjs.Random.extend(_mockjsRandomExtend);

export default MockSchema;
