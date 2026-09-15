# 视频录制脚本（中文版）v2

**建议时长：** 12-15 分钟
**建议布局：** 左边终端，右边编辑器/文档（可切换）

本版本相对 v1 的改动：新增"部署演示""安全扫描讲解""Holmes 质量扫描讲解"三段，
补强"决策原因"和"后续扩展"两段的台词，覆盖评审要求的全部 8 个打分点。

---

## 录制前准备（不在镜头内，务必提前做完）

因为要在镜头里演示一次**真实的** `cdk deploy`（而不是"已经部署好、看不出过程"），
需要先把当前栈销毁，这样录制时的部署才是从零创建：

```bash
cd /home/ec2-user/cognito-step-up-auth-demo/infra
cdk destroy      # 确认后销毁，会删除 Cognito/DynamoDB/Lambda
```

销毁后确认：

```bash
aws cloudformation describe-stacks --stack-name StepUpAuthStack
# 应返回 "does not exist"
```

其余检查同 v1：

```bash
# 确认 app/.env 里的 BOOKING_AMOUNT=8000（部署完成后 CLIENT_ID/USER_POOL_ID 需要重新填）
cat /home/ec2-user/cognito-step-up-auth-demo/app/.env

# 预跑一次完整流程（用旧的 stack 输出跑一遍，确认代码本身没问题，跑完再销毁）
# 如果上面已经销毁了，这一步可以跳过，直接相信之前验证过的记录
```

---

## 开场：客户业务问题（0:00 - 0:45）— 覆盖点 1

**台词：**

> 大家好，今天我来演示一个基于 Amazon Cognito 的二次验证（Step-Up Auth）参考实现。
>
> 背景：一家酒店集团正在用 Amazon Cognito 重建登录系统，同时要支持三个自定义认证场景——会员等级识别、二次验证、前台人工覆盖。这三个场景之前因为架构方案没定下来一直卡着。
>
> 我负责的是第二个场景：客人预订的房间金额超过 5,000 美元时，系统要求做一次额外的身份验证，确认这个高价值操作确实是本人发起的，不是账号被盗后的异常行为。
>
> 这个 Demo 就是这个需求的完整参考实现，客户团队可以直接照着这个模式移植到另外两个场景。

---

## 第一部分：架构与关键决策——为什么这样做（0:45 - 2:30）— 覆盖点 2

**操作：** 打开 `DECISIONS.md`，或直接讲解，不一定要在镜头里滚动全文。

**台词：**

> 先说几个关键的架构决策，以及为什么这么选，这些都记录在 `DECISIONS.md` 的 ADR 里。
>
> **第一，为什么用 Cognito 原生的 CUSTOM_AUTH 流程，而不是额外做一个独立的鉴权服务？**
> 因为 CUSTOM_AUTH 走的是 AWS 官方文档推荐的 Define / Create / Verify 三个 Lambda 触发器模式，颁发的 Token 里可以直接带自定义 Claim，下游服务验签就知道二次验证做过没有,不需要再调 Cognito API。更重要的是，这个三触发器模式跟另外两个场景——会员等级、前台覆盖——的结构是一模一样的，只是判断逻辑不同，所以移植成本最低。这是 ADR-001。
>
> **第二，为什么二次验证用邮箱验证码，而不是 TOTP 或短信？**
> 邮箱验证码不需要客人有额外设备，SES 也已经在客户的技术栈里，是旅游行业常见的模式。代价是邮件延迟比短信高，安全性也弱一些——所以这个机制我做成了可插拔的，只要换 `CreateAuthChallenge` 和 `VerifyAuthChallenge` 这两个 Lambda，就能换成 TOTP 或 WebAuthn，生产环境我在文档里建议按会员等级分级：银卡金卡用 TOTP，白金用 WebAuthn。这是 ADR-002。
>
> **第三，为什么阈值判断放在应用层，而不是放进 Lambda？**
> 这是我在实现过程中踩的一个坑：AWS 文档说 `InitiateAuth` 的 `ClientMetadata` 会传给 Lambda 触发器，但实测根本不会传。所以最初设计——让 Lambda 自己判断金额是否超阈值——直接不可行。我把判断逻辑挪到应用层，Cognito 只负责认证机制本身，业务规则完全不依赖这个未公开文档化的行为。这个坑记录在 `DECISIONS.md` 的 ADR-007 里，专门写出来是为了防止客户团队移植的时候再踩一次。

---

## 第二部分：部署演示（2:30 - 6:00）— 覆盖点 5

**操作：**

```bash
cd /home/ec2-user/cognito-step-up-auth-demo/infra
npm install
cdk bootstrap
```

**台词：**

> 先看部署。整套基础设施用 AWS CDK（TypeScript）管理，一键部署到任意账户。
>
> `cdk bootstrap` 是每个账户/region 第一次用 CDK 时要做的一次性初始化，创建 CDK 自己需要的 S3 桶和 IAM 角色。已经 bootstrap 过的账户执行这条命令是幂等的，不会重复创建。

**操作：**

```bash
cdk deploy --outputs-file ../app/.cdk-outputs.json
```

**台词（部署过程中）：**

> 现在执行真正的部署。CDK 会先合成 CloudFormation 模板，然后创建资源：一个 Cognito User Pool、一个 DynamoDB 表存 OTP、四个 Lambda 触发器、还有对应的 IAM 角色。这个过程一般要两三分钟，我们等它跑完。

**部署完成后，台词：**

> 部署完成，CDK 输出了几个关键值：User Pool ID、App Client ID、OTP 表名。这些已经写进了 `app/.cdk-outputs.json`。

**操作（走一遍 README 里的 Post-Deploy Verification）：**

```bash
cat ../app/.cdk-outputs.json

aws lambda list-functions \
  --query "Functions[?starts_with(FunctionName,'StepUpAuthStack')].FunctionName" \
  --output table

aws cognito-idp describe-user-pool \
  --user-pool-id "$(jq -r '.StepUpAuthStack.UserPoolId' ../app/.cdk-outputs.json)" \
  --query 'UserPool.Status'

aws dynamodb describe-table \
  --table-name "$(jq -r '.StepUpAuthStack.OtpTableName' ../app/.cdk-outputs.json)" \
  --query 'Table.TableStatus'
```

**台词：**

> 这四条命令是 README 里"Post-Deploy Verification"这一节的内容，专门是给非我本人的工程师用的——不需要猜，跑这几条命令就能确认四个 Lambda 都建好了、User Pool 是 ACTIVE、DynamoDB 表是 ACTIVE。这一步是我们之前评审反馈里特别要求补的，现在 README 里已经有独立章节了。

**操作：**

```bash
cd ../app
npm install
cp .env.example .env
# 打开 .env，把 CLIENT_ID / USER_POOL_ID 换成刚才输出的新值
node src/setup.js
```

**台词：**

> 更新一下应用的环境变量，然后跑 `setup.js` 创建一个测试用户，准备接下来的端到端演示。

---

## 第三部分：项目结构（6:00 - 7:00）— 覆盖点 4

**操作：**

```bash
cd /home/ec2-user/cognito-step-up-auth-demo
ls
```

**台词：**

> 看一下项目结构，方便其他 SA 不用问我也能找到东西。
>
> `infra` 是刚才用到的 CDK 代码。`lambdas` 是四个业务逻辑函数。`app` 是刚才跑的示例应用。
>
> 文档这边：`README.md` 是入口；`DECISIONS.md` 是刚才讲的架构决策记录；`SECURITY_COMPLIANCE.md` 是安全设计和风险登记册，等下会讲；`docs/quality-findings.md` 是 Holmes 质量扫描的书面记录，也等下讲；`docs/porting-guide.md` 是移植指南，讲怎么把这套模式复用到另外两个场景。

**操作：**

```bash
ls lambdas/
```

**台词：**

> 四个 Lambda：`define-auth-challenge` 是状态机，决定要不要发起挑战；`create-auth-challenge` 生成验证码写入 DynamoDB 并发送；`verify-auth-challenge` 验证用户输入，防重放；`pre-token-generation` 在颁发 Token 前注入 `step_up` 相关的 Claim。

---

## 第四部分：端到端运行 Demo（7:00 - 10:30）— 覆盖点 3

**终端 1：**

```bash
cd /home/ec2-user/cognito-step-up-auth-demo/app
node src/demo.js
```

**台词（Step 1 输出后）：**

> Step 1，用户正常登录，初始 Token 里没有 `step_up` 字段。

**台词（Step 2 输出后）：**

> Step 2，应用层检查订单金额，8,000 美元超过 5,000 的阈值，需要二次验证——这就是刚才 ADR-007 讲的、应用层做判断的地方。

**台词（Step 3 输出后）：**

> Step 3，发起 Cognito 的 CUSTOM_AUTH 流程，Cognito 调用我们的 Lambda 返回挑战，验证码已经发出去了。

**切到终端 2：**

```bash
aws logs tail /aws/lambda/StepUpAuthStack-CreateAuthChallenge --since 2m --follow
```

**台词：**

> 生产环境验证码会发到客人邮箱，演示环境用 console 模式直接打日志，方便录屏。

**看到 OTP 后切回终端 1 输入，Step 6 输出后台词：**

> 验证通过。新 Token 里多了三个字段：`step_up` 是 true，`step_up_at` 是验证时间戳，`step_up_booking_amount` 是 8,000。下游的预订系统和支付系统验签之后直接读这几个字段，不需要再调 Cognito。

**操作：** 把 `.env` 的 `BOOKING_AMOUNT` 改成 3000，再跑一次：

```bash
node src/demo.js
```

**台词：**

> 对比一下低于阈值的情况。这次 3,000 美元，Step 2 直接判断不需要二次验证，整个 CUSTOM_AUTH 完全没被触发，用户无感知——只在必要的时候增加摩擦。

---

## 第五部分：安全扫描讲解（10:30 - 12:15）— 覆盖点 6

**操作：** 打开 `infra/lib/step-up-auth-stack.ts`，定位到 `NagSuppressions` 那一段；同时打开 `SECURITY_COMPLIANCE.md`。

**台词：**

> 基础设施代码跑了 cdk-nag 的 AwsSolutionsChecks 安全扫描，我讲一下具体的 finding 和处理方式。
>
> **直接修复的三项：**
> `AwsSolutions-DDB3`，DynamoDB 表没开点时恢复，我加了 Point-in-Time Recovery。
> `AwsSolutions-L1`，Lambda 运行时版本过旧，从 Node.js 22.x 升级到了 24.x。
> `AwsSolutions-COG1`，密码策略缺特殊字符要求，我加上了。
>
> **保留但接受、并写了理由压制的三项：**
> `AwsSolutions-IAM4`，CDK 自动挂的 `AWSLambdaBasicExecutionRole` 只给 CloudWatch Logs 写权限，收窄这个角色没有实际安全收益，所以接受。
> `AwsSolutions-COG2`，说 Cognito 没开 MFA——但这整个项目做的就是一个二次验证方案，OTP 挑战流程本身就是第二因子，再开 Cognito 级别的 MFA 反而跟 Demo 的目的冲突，所以不采纳。
> `AwsSolutions-COG8`，建议升级到 Cognito Plus tier——这个原型不需要高级安全特性，standard tier 够用，所以接受现状。
>
> 除了 cdk-nag，`SECURITY_COMPLIANCE.md` 里还有一份完整的风险登记册，记录了几个在非生产环境下有意不修复的风险，比如 `USER_PASSWORD_AUTH` 代替 SRP、`RemovalPolicy.DESTROY`、没有 WAF——每一条都写清楚了触发条件、影响、以及为什么在这个阶段可以接受，生产化清单也列在同一份文档最后。

---

## 第六部分：Holmes 质量扫描讲解（12:15 - 13:45）— 覆盖点 7

**操作：** 打开 `docs/quality-findings.md`。

**台词：**

> 代码质量这边用的是 Holmes 扫描，模板是 HolmesCDE，评分标准是 CDE Evaluation Rubric v2，一共 12 个维度。
>
> 第一次扫描抓到 3 个 finding，都是 high 严重级：README 缺"部署后验证"步骤、README 缺"已知限制"汇总、`demo.js` 里有一个从没被用到的死代码变量 `USER_POOL_ID`。这三个我都在后续 commit 里直接修复了——刚才讲部署那段时候看到的 Post-Deploy Verification 章节，就是修复第一个 finding 的结果。
>
> 修完之后重新跑了一次扫描，scan ID `fe1635c0`，同样的模板和 rubric，结果是 0 个 finding，12 个维度里 10 个是 exemplary，2 个是 acceptable。这个前后对比和具体的 finding 明细我都写进了 `docs/quality-findings.md`，方便任何人不用等我讲解也能查到。

---

## 结束语：后续扩展（13:45 - 14:30）— 覆盖点 8

**操作：** 打开 `docs/porting-guide.md`，滚动到 Flow 1 / Flow 2 的标题即可，不用逐行讲代码。

**台词：**

> 最后说一下客户团队之后怎么继续这个工作。
>
> 这套 Define / Create / Verify / Pre-Token-Generation 四个触发器的模式是通用的，`docs/porting-guide.md` 里详细写了怎么把它改造成另外两个场景：会员等级识别只需要把"金额判断"换成"读取 `custom:loyalty_tier` 属性"；前台人工覆盖需要多一个"前台员工发起挑战"的入口，架构上的差异也在文档里画出来了，还给了每个场景的工作量估算。
>
> 生产化之前要做的事情列在 `SECURITY_COMPLIANCE.md` 的 Production Promotion Checklist 里，比如换成 SRP 认证、开 WAF、把 `RemovalPolicy` 改成 `RETAIN`。
>
> 整套基础设施都是 CDK 管理，客户团队拿到这个仓库之后，跟我今天演示的一样，`cdk bootstrap` + `cdk deploy` 就能在自己的账户里跑起来。谢谢。
