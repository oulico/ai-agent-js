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
    console.log(`DB에서 ${name}의 정보를 조회합니다...`);

    const {data, error} = await supabase
        .from('users')
        .select('*')
        .eq('name', name)
        .single();

    console.log(`Supabase 조회 결과: ${JSON.stringify(data)}`);

    // 에러가 있으면 에러 반환
    if (error) {
        console.log(`Supabase 조회 실패: ${error.message}`);
        return {
            success: false,
            error: error.message,
            message: `사용자 ${name} 조회 중 오류가 발생했습니다.`
        };
    }

    // 데이터가 없으면 Not Found 반환
    if (!data) {
        console.log(`Supabase에 ${name}의 정보가 없습니다.`);
        return {
            success: false,
            message: `사용자 ${name}을(를) 찾을 수 없습니다.`
        };
    }

    // 성공적으로 데이터를 찾은 경우
    console.log(`✅ ${name} 정보를 성공적으로 조회했습니다.`);
    return {
        success: true,
        data: data,
        source: "supabase"
    };
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
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`	함수: ${functionName}`);
        console.log(`   인수: ${JSON.stringify(functionArgs)}`);

        //3단계 함수 실행
        let result;
        if (functionName === "get_user_info") {
            try {
                result = await get_user_info(functionArgs.name);
            } catch (error) {
                console.error(`함수 실행 중 오류: ${error.message}`);
                result = {
                    success: false,
                    error: error.message,
                    message: "시스템 오류가 발생했습니다."
                };
            }
        } else {
            result = {
                success: false,
                error: "Unknown function",
                message: `알 수 없는 함수: ${functionName}`
            };
        }

        console.log(`	결과: ${JSON.stringify(result)}`);

        // ChatGPT에게 결과 전달하고 최종 답변 받기
        const finalResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {role: "user", content: userMessage},
                {role: "assistant", content: null, tool_calls: message.tool_calls},
                {role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result)}
            ]
        });

        console.log(`ChatGPT: ${finalResponse.choices[0].message.content}`);
    }

    async function test() {
        console.log(`Supabase 연동 Function Calling Test\n`);

        await chat("김철수 정보 알려줘");
        console.log('\n' + '='.repeat(40) + '\n');

        await chat("이영희는 어느 팀이야?");
        console.log('\n' + '='.repeat(40) + '\n');

        await chat("홍길동 정보 알려줘");
        console.log('\n' + '='.repeat(40) + '\n');

        await chat("안녕하세요!");
    }

    test().catch(console.error);
