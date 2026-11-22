# @saoutax/dsh-full-access

[English](README.md) | 简体中文

一个 DeepSeek Harness 插件，做两件事：新会话默认使用**完全权限**；输入框的权限芯片切换模式时不再弹额外的风险确认。

## 改变的行为

- **新会话默认值。** Agent 为新对话创建时，插件把配置的预设（默认 `danger-full-access`）写入该会话。恢复的会话、压缩后的会话和带种子的分叉保留它们继承的权限。
- **输入框芯片不再确认。** 输入框工具栏上的权限芯片由本插件自己的控件接管。选择完全权限或自动审查会立即切换，官方的风险确认框不再出现。

## 不做接管的部分

- `/permission` 斜杠面板和通用设置里的「默认权限」行保持官方实现。在那里选择完全权限或自动审查仍会要求勾选确认；直接输入 `/permission <预设名>` 仍然直接生效（Host 对带参数的写法不做确认）。
- 通用设置里的默认值**不会**影响本插件。要改默认权限，请改本插件自己的 `defaultPreset`；停用插件即可恢复官方默认。

## 安装

包已发布到 npm，用 DSH CLI 安装：

```sh
dsh plugin --profile web add @saoutax/dsh-full-access
```

Plugin Manager 也支持从目录或打包好的 `.tgz` 安装，适合离线安装与本地开发。

安装后插件立即生效，页面会重建客户端模块图，输入框芯片替换为我们的控件。

## 配置

| 字段            | 默认值               | 含义                     |
| --------------- | -------------------- | ------------------------ |
| `defaultPreset` | `danger-full-access` | 写入每个新建对话的预设。 |

这一行位于 profile 的 `cordis.patch.yml`：

```yaml
- id: full-access
  name: '@saoutax/dsh-full-access'
  config:
      defaultPreset: danger-full-access
```

预设必须是本部署通过 `@deepseek-ai/dsh-permission-presets` 发布过的名字。如果不在目录里，插件会在激活时记录一条警告，新会话继续使用组合配置的默认权限。

## 兼容性与维护

插件只在既有的 `conversation.input.permission` 槽里新增一个注册，priority 低于官方芯片；single 槽只渲染 priority 最低的注册，所以两者不会同时出现，停用本插件就恢复官方芯片。其余都是公开接口：

- 槽名与它的属性（`locked`、`useProjection`、注入的 `select`）；
- `permission-presets` 的目录 Remote 与目录变更通知；
- Host 的 `/permission <预设名>` 命令；
- `agent/created` 事件与 `permissionPresets` 服务的 `names`、`current`、`set`。

已在 DSH `0.2.2-rc.1` 上验证。后续 Harness 若改动其中任一接口，本插件需要同步修改；客户端部分会以槽条目报错的形式在页面控制台暴露问题，不会静默失效。

## 开发

```sh
pnpm install
pnpm run build     # 构建两端产物并刷新 icon.svg
pnpm run check     # oxfmt + 类型感知 oxlint + tsc + vitest + build
pnpm run fmt       # 格式化
pnpm run lint      # 语法 lint
```

- `src/host/` 构建为 `lib/index.js`（ESM）。Harness 包保持 external，运行时从 dsh 安装目录解析。
- `src/client/` 构建为 `lib/client.js`，包成 `window.__ModuleLoader__.load({ id, factory })` 注册。React 与 ReactDOM 来自页面的模块表；芯片字形内置在插件里。

## 发布

每次推送到 `main` 都会运行 CI。在 `main` 上，[release-please](https://github.com/googleapis/release-please) 会保持一个发布 PR，包含下一个版本号与 CHANGELOG 条目。合并该 PR 后创建 tag 与 GitHub Release，附加打包好的 `.tgz`，并把同一个 tag 发布到 npm。

npm 作业需要仓库 secret `NPM_TOKEN`：一个有 `@saoutax` 作用域发布权限的 npm automation token。包在 npm 上存在之后，可以改用 trusted publisher（仓库 `Saoutax/dsh-full-access`、workflow `release.yml`、environment `npm-publish`）替代 token，工作流注释里写了具体位置。

## 图标

芯片与菜单字形复制自 DeepSeek Harness 自带的图标集（MIT），让控件看起来与被替换的官方控件一致。插件自己的 `icon.svg` 在构建时由 [Lucide](https://lucide.dev) 图标数据生成（`unlock-keyhole`）；Lucide 使用 [ISC 许可证](https://lucide.dev/license)，只在构建阶段使用，不会打进客户端产物。

## 许可证

插件自身代码为 MIT。随包使用的 Lucide 图形为 ISC（见上）。
