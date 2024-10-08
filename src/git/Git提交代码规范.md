---
icon: fa-solid fa-code-branch
date: 2022-01-07
category:
  - Git
tag:
  - 规范
---

```
<type>(<scope>):<subject>
<--空行-->
[正文]
<--空行-->
[页脚]
```

<!-- more -->

# Git提交代码规范

## Git操作commit备注规范

**模板：**

```
<type>(<scope>):<subject>
<--空行-->
[正文]
<--空行-->
[页脚]
```

**提交示例：**

```
feat(订单功能模块): 订单功能模块相关接口开发
 
fix(用户信息模块): 用户信息模块新增功能BUG修复

perf(商品页面): 优化商品页面查询效率
```

完整提交示例

```
git commit -m 'perf(商品页面): 优化商品页面查询效率

1. 接入elasticsearch搜索引擎，提高查询效率
2. 优化查询条件

破坏性的变更: 移除了接口入参的字段A，数据查询将不再支持根据字段A进行数据过滤。
'
```

>type  
>作用: 用于说明 Git Commit 的类别，只允许使用下面的标识。  
>标识  
>sync：同步主线或分支的bug。  
>merge：代码合并。  
>revert：回滚到上一个版本。  
>chore：构建过程或辅助工具的变动。  
>test：增加测试。  
>**perf：优化相关，比如提升性能、体验。**  
>**refactor：重构（既不是新增功能，也不是修改bug的代码变动）。**  
>**style：格式（不影响代码运行的变动）。**  
>docs：文档（documentation）。  
>**fix：修复bug，可以是QA(Quality Assurance)发现的bug，也可以是研发自己发现的bug。**  
>**feat：新功能（feature）。**

>scope  
>作用: scope用于说明 Commit 影响的范围，比如数据层、控制层、视图层或功能模块等，视项目不同而不同。

>subject  
>作用: subject是commit目的的简短描述，一般不超过50个字符。相当于标题。

>正文  
>正文是对标题的补充，但它不是必须的，正文应该包含更详细的信息，如代码修改的动机，与修改前的代码对比等。

>页脚  
>用于记录破坏性的变更，例如删除某个接口、接口的参数减少、某个接口调整后不兼容以前的版本等  
>BREAKING CHANGE(破坏性的变更):


## Git项目提交流程

1. 拉取代码

```
git clone http://xxxxxxxxx/xx.git
```

2. 确认当前处理main主分支

```
git branch
```

3. 创建本地开发分支**(分支名要加上“tmp_”前缀，标识是临时分支，合并后可以删除，如果不加，则表示为系统分支，不能删除)**

```
git checkout -b tmp_xxx
```

4. 确认当前处于新建的分支tmp_xxx

```
git branch
```

5. 在新分支开发完成之后，提交分支

```
git add test.java
git status      // 确认无代码文件遗漏
git commit -m 'feat(Test):测试类开发'
git push -u origin tmp_xxx
```



- 如果此次修改在git的issue上有对应的工单，则需要在commit的时候进行关联，操作方式如下`#XX`

关联一个BUG工单，其中的#10为issue的id（issue的id可以到对应的仓库点开工单页签进行查看）

```
git commit -m 'fix(用户模块): 用户信息模块新增功能BUG修复; (#10)'
```

一个commit可以关联多个issue工单(不同工单之间用空格隔开)，例如

```
git commit -m 'fix(用户模块): 用户信息模块新增功能BUG修复; (#10 #11 #12)'
```


6. 在gitee上发起分支合并请求

7. 当确认合并请求审核通过,且tmp_xxx分支合并到主分支之后，删除本地的tmp_xxx分支，该功能开发结束

```
git branch -D tmp_xxx
git checkout main   或者   git checkout master      (根据主分支是main还是master去选择)
git branch -r -D origin/tmp_xxx
```