# 视频录制脚本（中文版）

**建议时长：** 6-8 分钟  
**建议布局：** 左边终端，右边 AWS 控制台（可选）

---

## 开场（0:00 - 0:45）

**台词：**

> 大家好，今天我来演示一个基于 Amazon Cognito 的二次验证实现方案。
>
> 背景是这样的：一家酒店集团在重建他们的登录系统，底层使用 Amazon Cognito。他们有一个安全需求：当客人预订的房间金额超过 5,000 美元的时候，需要做额外的身份验证，确认是本人操作。
>
> 这个 Demo 就是这个需求的完整参考实现，包括 AWS 基础设施、Lambda 业务逻辑、示例应用，以及完整的文档。

---

## 第一部分：项目结构（0:45 - 2:00）

**操作：**
```bash
cd /home/ec2-user/cognito-step-up-auth-demo
ls
```

**台词：**

> 先看一下项目结构。
>
> `infra` 目录是 CDK 基础设施代码，用于把所有 AWS 资源一键部署到任意账户。
>
> `lambdas` 目录是核心业务逻辑，四个 Lambda 函数组成了整个认证流程。
>
> `app` 目录是示例应用，演示完整的端到端流程。
>
> 文档方面，有架构设计文档、安全合规说明、决策记录，以及移植指南——告诉客户的工程团队如何把这个模式复用到其他两个认证流程上。

**操作：**
```bash
ls lambdas/
```

**台词：**

> 这四个 Lambda 函数构成了 Cognito 的 Custom Auth Challenge 机制。
>
> `define-auth-challenge` 是状态机，决定是否发起挑战、是否颁发 Token。
>
> `create-auth-challenge` 负责生成验证码，写入 DynamoDB，发送到用户邮箱。
>
> `verify-auth-challenge` 验证用户输入的验证码是否正确，同时防止重放攻击。
>
> `pre-token-generation` 在颁发 JWT 之前，把 `step_up` 标记写入 Token，这样下游服务不需要再调用 Cognito 就能验证。

---

## 第二部分：核心代码（2:00 - 3:30）

**操作：**
```bash
cat lambdas/define-auth-challenge/index.js
```

**台词：**

> 这是状态机逻辑。Session 为空的时候，发起 CUSTOM_CHALLENGE。挑战通过之后，颁发 Token。失败次数超过 3 次，直接拒绝。逻辑很清晰。

**操作：**
```bash
cat lambdas/create-auth-challenge/index.js
```

**台词：**

> 这里生成 6 位验证码，使用 Node.js 内置的 `crypto.randomInt`，是密码学安全的随机数。验证码存入 DynamoDB，设置 5 分钟 TTL 自动过期。然后通过 SES 发送到用户邮箱。Demo 环境里我们用 console 模式，直接打印到 CloudWatch 日志，方便演示。

**操作：**
```bash
cat lambdas/pre-token-generation/index.js
```

**台词：**

> 最后这个 Lambda 在颁发 Token 前注入三个自定义 Claim：`step_up` 标记、验证时间戳、以及订单金额。这样酒店的预订系统和支付系统拿到 Token 之后，本地验签就能确认二次验证已完成，完全不需要再调用 Cognito。

---

## 第三部分：运行 Demo（3:30 - 6:30）

**终端 1：**
```bash
cd /home/ec2-user/cognito-step-up-auth-demo/app
node src/demo.js
```

**台词（Step 1 输出后）：**

> Step 1，用户正常登录。可以看到初始的 Token 里没有 `step_up` 这个字段，这是正常的普通登录 Token。

**台词（Step 2 输出后）：**

> Step 2，应用层检查订单金额。8,000 美元超过了 5,000 的阈值，所以需要二次验证。

**台词（Step 3 输出后）：**

> Step 3，发起 Cognito 的 CUSTOM_AUTH 流程。Cognito 调用了我们的 Lambda，返回了一个挑战，同时验证码已经发送出去了。

**程序停在 OTP 输入提示时，切到终端 2：**
```bash
aws logs tail /aws/lambda/StepUpAuthStack-CreateAuthChallenge --since 2m --follow
```

**台词：**

> 现在来 CloudWatch 日志里查看验证码。在生产环境，这个验证码会发到客人的注册邮箱。演示环境我们直接从日志里读取。

**看到 OTP 后，切回终端 1 输入，台词：**

> 拿到验证码了，切回来输入。

**Step 6 输出后，台词：**

> 验证通过。来看一下新颁发的 Token。可以看到这里多了三个字段：`step_up` 是 true，`step_up_at` 是验证完成的时间戳，`step_up_booking_amount` 是 8,000。
>
> 酒店的预订系统收到这个 Token，验签之后就能直接读取这些 Claim，确认二次验证已经完成，完全不需要再调用 Cognito API。

---

## 第四部分：对比低价值订单（6:30 - 7:30）

**操作：** 修改 `.env` 里的 `BOOKING_AMOUNT=3000`，再跑一次：
```bash
node src/demo.js
```

**台词：**

> 最后对比一下低于阈值的情况。这次订单是 3,000 美元。
>
> 可以看到，Step 2 直接判断不需要二次验证，整个流程跳过了 CUSTOM_AUTH，没有触发任何 Lambda，用户无感知。
>
> 这就是二次验证的核心逻辑：只在必要的时候增加摩擦，不影响正常订单体验。

---

## 结束语（7:30 - 8:00）

**台词：**

> 这个参考实现完整展示了 Cognito Custom Auth Challenge 的使用方式。
>
> 整个模式可以直接移植到另外两个认证流程：会员等级识别和前台人工覆盖。具体的移植步骤在 `docs/porting-guide.md` 里有详细说明。
>
> 基础设施全部用 CDK 管理，可以一键部署到任意 AWS 账户。谢谢。

---

## 录制前检查清单

```bash
# 1. 确认 .env 配置正确（BOOKING_AMOUNT=8000）
cat /home/ec2-user/cognito-step-up-auth-demo/app/.env

# 2. 确认测试用户存在
cd /home/ec2-user/cognito-step-up-auth-demo/app
node src/setup.js

# 3. 先做一次完整预跑，确认流程没问题
node src/demo.js
```
