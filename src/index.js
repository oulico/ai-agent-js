require('dotenv').config();

const OpenAI = require('openai');
const {createClient} = require("@supabase/supabase-js");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const mockUsers = [
    {id: 1, name: "김철수", department: "개발팀", position: "시니어 개발자"},
    {id: 2, name: "이영희", department: "디자인팀", position: "UX 디자이너"},
    {id: 3, name: "박민수", department: "마케팅팀", position: "마케팅 매니저"}
];


const tools = [
    {
        type: "function", // 항상 "function"
        function: { // 항상 "function"키
            name: "get_user_info", // 실제 함수 이름
            description: "직원 정보를 조회합니다", // AI가 언제 쓸지 판단하는 설명
            parameters: { // JSON 스키마 형식
                type: "object", // 항상 "object"
                properties: { // 매개변수 정의 (여기서부터는 모두 가변적임. 내 맘대로임"
                    name: {
                        type: "string",
                        description: "직원 이름"
                    }
                },
                required: ["name"] // 필수 항목
            }
        }
    }
];


async function get_user_info(name) {

    try {
        console.log(`DB에서 ${name}의 정보를 조회합니다...`);

        const {data, error} = await supabase
            .from('users')
            .select('*')     // ← 모든 컬럼 조회
            .eq('name', name)
            .single();
        console.log(`Supabase 조회 결과: ${JSON.stringify(data)}`); // supabase data { id: 1, name: '김철수', department: '개발팀', position: '시니어 개발자' }

        // supabase data { name: '김철수' }
        if (error) {
            console.log(`Supabase 조회 실패 : ${error.message}`);
            console.log(`mockUsers에서 조회 시도...`);

            const user = mockUsers.find(user => user.name === name);

            if (user) {
                return {
                    success: true,
                    data: user,
                    source: "mock"
                };
            } else {
                return {
                    success: false,
                    message: `사용자 ${name}을(를) 찾을 수 없습니다.`
                };
            }
        }

        if (data) {
            return {
                success: true,
                data: data,
                source: "supabase"
            };
        } else {
            console.log(`Supabase에 ${name}의 정보가 없습니다.`);

            const user = mockUsers.find(user => user.name === name);

            if (user) {
                return {
                    success: true,
                    data: user,
                    source: "mock"
                };
            } else {
                return {
                    success: false,
                    message: `사용자 ${name}을(를) 찾을 수 없습니다.`
                };
            }
        }

    } catch (error) {
        console.error(`조회 중 오류: ${error.message}`);

        const user = mockUsers.find(user => user.name === name);

        if (user) {
            return {
                success: true,
                data: user,
                source: "mock (오류 발생)"
            };
        } else {
            return {
                success: false,
                message: `사용자 ${name}을(를) 찾을 수 없습니다.`
            };
        }
    }
}

async function chat(userMessage) {
    console.log(`사용자: ${userMessage}`);

    // 1단계: ChatGPT에게 메시지 전송
    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{role: "user", content: userMessage}],
        tools: tools,
        tool_choice: "auto"
    });

    const message = response.choices[0].message;

    if (message.tool_calls) {
        console.log("Chat gpt가 도구 사용을 요청했습니다");

        const toolCall = message.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments)

        console.log(`	함수: ${functionName}`);
        console.log(`   인수: ${JSON.stringify(functionArgs)}`);

        //3단계 함수 실행
        let result;
        if (functionName === "get_user_info") {
            result = await get_user_info(functionArgs.name)
        }

        console.log(`	결과: ${JSON.stringify(result)}`);

        //4단계: 결과를 ChatGPT에게 전달하고 최종 답변 받기
        const finalResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [// 이부분이 세부분으로 나뉘어져 있는 것도 국룰이다. 안그러면 chat gpt가 혼란스러워 함.
                {role: "user", content: userMessage},
                {role: "assistant", content: null, tool_calls: message.tool_calls},
                {role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result)},

            ],

        });
        console.log(`ChatGPT: ${finalResponse.choices[0].message.content}`); // 여기서 choices[0]이 있는 것은 chatGPT가 여러개의 답변을 준비하기 때문임. 대부분의 경우 하나만 사용하는 것이 토큰 절약에 좋음. 게다가 function calling 에서는 정확한 함수 실행이 제일 중요하므로 여러 답변 보다는 하나의 정확한 실행이 더 중요함.
    } else {
        //도구 사용없이 일반 답변
        console.log(`ChatGPT: ${message.content}`);
    }

}

async function test() {
    console.log(`간단한 Function Calling Test \n`);

    await chat("김철수 정보 알려줘");
    console.log('\n' + '='.repeat(40) + '\n');

    await chat("이영희는 어느 팀이야?");
    console.log('\n' + '='.repeat(40) + '\n');

    await chat("홍길동 정보 알려줘");
    console.log('\n' + '='.repeat(40) + '\n');

    await chat("안녕하세요!");

}

test().catch(console.error);

