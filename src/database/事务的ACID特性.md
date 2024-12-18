---
title: 事务的ACID特性
date: 2024-10-11
author: 云泽
order: 30
# 此页面会出现在星标文章中
star: true
category:
   - 数据库
tag:
   - 事务
---



事务的ACID特性是指数据库操作的4个关键特征，原子性、一致性、隔离性和持久性。

<!-- more -->

# 事务的ACID特性



## 原子性

一次事务，是一个最小的原子操作，要么全部提交成功，要么全部操作回滚。当一次事务在执行时，出现了异常问题，就会触发回滚操作，会将数据回滚到事务执行之前的状态，保证数据的一致性。

## 一致性

一个事务执行完毕后，数据库里的数据必须保持一致性的状态。（这个一致性是通过使用者的业务场景来判断的）

数据库自己是不知道一致性是什么的，需要认为的去判断，

例如，有两个账户A和B，A需要给B转账10元，则A的余额是减10元，B的余额就会加10元，这种就是转账的操作就达到了一致性的标准。如果A的余额减了10元，但是B的余额没变，或B的余额加了10元，但是A的余额没变，这就是不一致，就达不到一致性。

所以这个标准是有使用者根据实际的业务场景去判断的。

## 隔离性

事务与事务之间存在隔离性，一个事务的执行过程，不会对其他的事务产生影响。也就是说，一个事务对数据的操作，在其事务提交结束前，其更新数据对其他事务是不可见的，防止出现数据混乱的情况。

## 持久性

事务在最终提交之后，其操作的数据更新需要进行一个存盘操作，事务提交之后，即使服务器出现异常宕机等故障，更新的数据也不会丢失。