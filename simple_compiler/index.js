
function parsing(rawcode){
    function lexicalAnalysis(rawcode){
        let current = 0;
        let tokens = [];

        while(current < rawcode.length){
            let char = rawcode[current],
                WHITESPACE =  /\s/,
                NUMBERS = /[0-9]/,
                LETTERS = /[a-z]/i;

            if(char === '('){
                tokens.push({
                    type: 'paren',
                    value: '('
                });

                current++;
                continue;
            }

            if(char === ')'){
                tokens.push({
                    type: 'paren',
                    value: ')'
                });

                current++;
                continue;
            }

            if(WHITESPACE.test(char)){
                current++;
                continue;
            }

            if(NUMBERS.test(char)){
                let value = '';

                while(NUMBERS.test(char)){
                    value += char;
                    char = rawcode[++current];
                }
                
                tokens.push({
                    type: 'number',
                    value: value
                });
                continue;
            }

            if(char === '"'){
                let value = '';
                char = rawcode[++current];

                while(char !== '"'){
                    value += char;
                    char = rawcode[++current]
                }

                char = rawcode[++current];
                tokens.push({
                    type: 'string',
                    value: value
                });
                continue;
            }

            if(LETTERS.test(char)){
                let value = '';

                while(LETTERS.test(char)){
                    value += char;
                    char = rawcode[++current];
                }

                tokens.push({
                    type: 'name',
                    value: value
                });
                continue;
            }

            throw new TypeError('I dont know what this character is: ' + char);
        }

        return tokens;   
    }
    function syntacticAnylysis(tokens){
        let current = 0,
            ast = {
                type: 'Program',
                body: []
            };


        function walk(){
            let token = tokens[current];

            if(token.type === 'number'){
                current++;
                return {
                    type: 'NumberLiteral',
                    value: token.value
                };
            }

            if(token.type === 'string'){
                current++;
                return {
                    type: 'StringLiteral',
                    value: token.value
                };
            }

            if(token.type === 'paren' && token.value=== '('){
                token = tokens[++current];

                let node = {
                    type: 'CallExpression',
                    name: token.value,
                    params: []
                }

                token = tokens[++current];

                while((token.type != 'paren') || (token.type === 'paren' && token.value !== ')')){
                    node.params.push(walk());
                    token = tokens[current];
                }

                current++;
                
                return node;
            }

            throw new TypeError(token.type);
        }
        while(current < tokens.length){
            ast.body.push(walk());
        }
        return ast;
    }
    return syntacticAnylysis(lexicalAnalysis(rawcode));
}
function transform(ast){
    let newAst = {
        type: 'Program',
        body: []
    },
    visitor = {
        NumberLiteral: {
            enter(node, parent){
                parent._context.push({
                    type: 'NumberLiteral',
                    value: node.value
                });
            }
        },

        CallExpression: {
            enter(node, parent){
                let expression = {
                    type: 'CallExpression',
                    callee: {
                        type: 'Identifier',
                        name: node.name
                    },
                    arguments: []
                };

                node._context = expression.arguments;

                if(parent.type !== 'CallExpression'){
                    expression = {
                        type: 'ExpressionStatement',
                        expression: expression
                    }
                }

                parent._context.push(expression);
            }
        },

        StringLiteral:{
            enter(node, parent){
                parent._context.push({
                    type: 'StringLiteral',
                    value: node.value
                });
            }
        }
    };

    ast._context = newAst.body;

    function traverse(ast, visitor){

        function traverseArray(array, parent){
            array.forEach( child => {
                traverseNode(child, parent);
            });
        }

        function traverseNode(node, parent){
            let method = visitor[node.type];

            if(method && method.enter){
                method.enter(node, parent);
            }

            switch(node.type){
                case 'Program':
                    traverseArray(node.body, node);
                    break;
                case 'CallExpression':
                    traverseArray(node.params, node);
                    break;
                case 'NumberLiteral':
                case 'StringLiteral':
                    break;
                default:
                    throw new TypeError(node.type);
            }
        }

        traverseNode(ast, null);
    }

    traverse(ast, visitor);
    return newAst;
}
function generate(newAst){
    switch(newAst.type){
        case 'Program':
            return newAst.body.map(generate).join('\n');
        case 'ExpressionStatement':
            return (generate(newAst.expression) + ';');
        case 'CallExpression':
            return (generate(newAst.callee) + '(' + newAst.arguments.map(generate).join(', ') + ')');
        case 'Identifier':
            return newAst.name;
        case 'NumberLiteral':
            return newAst.value;
        case 'StringLiteral':
            return '"' + newAst.value + '"';
        default:
            throw new TypeError(newAst.type);
    }
}

function compiler(rawcode){
   let ast = parsing(rawcode);
   let newAst = transform(ast);
   let output = generate(newAst);
   return output;
}

console.log(compiler('(add 2 (subtract 4 2))'))