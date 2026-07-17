# 初中数学题库管理后台 V1

这是一个可以直接部署到 GitHub Pages 的静态管理后台，不需要 Node.js 或构建工具。

## 文件结构

```text
junior-math-question-bank/
├─ admin/
│  ├─ index.html
│  ├─ admin.css
│  └─ admin.js
└─ data/
   └─ vieta-theorem.json
```

把本压缩包里的 `admin` 和 `data` 文件夹上传到 GitHub 仓库根目录，然后访问：

```text
https://你的用户名.github.io/junior-math-question-bank/admin/
```

## 当前功能

- JSON、Excel、CSV 文件上传
- 支持本项目 `metadata + groups + items` JSON 格式
- 支持普通 JSON 数组
- 支持直接粘贴 JSON 或纯题目文本
- 自动识别年级、章节、知识点、题型与难度
- 自动生成置信度并进入待审核状态
- 疑似重复题检测
- 同一题目 ID 再次上传时自动更新并重新进入审核
- 导入审核、批量发布、存为草稿和重新分析
- 全部题目筛选、编辑、下架、删除和导出
- 知识点目录管理
- 完整数据备份与恢复
- 示例题库一键载入

## 数据保存说明

V1 使用浏览器 `localStorage`：

- 修改只保存在当前浏览器和当前设备；
- 清除浏览器数据会丢失；
- 请经常使用“导出完整备份”；
- 不适合多人同时管理。

下一阶段接入 Supabase 后，再实现管理员登录、云端数据库、多人同步和真正的 AI 分析。

## 首页添加管理入口

在根目录 `index.html` 的导航中加入：

```html
<a href="./admin/">题库管理</a>
```

## 上传 GitHub 的方法

1. 打开 GitHub 仓库。
2. 按键盘英文句号 `.` 进入 github.dev。
3. 把 `admin` 和 `data` 文件夹拖到左侧文件区。
4. 打开 Source Control，填写提交说明。
5. 点击 Commit & Push。
6. 等 GitHub Pages 更新后访问 `/admin/`。
