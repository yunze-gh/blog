---
icon: fa-solid fa-circle-nodes
date: 2022-01-06
order: 50
category:
  - 非关系数据库
tag:
  - Redis
  - NoSQL
  - 缓存
  - 集群
---

Redis集群的架构是通过哈希槽算法实现数据分片存储，以及主从结构解决读写分离和负载均衡问题。集群节点间的通信机制为gossip协议，负责处理集群的故障检测与恢复流程，以及集群的扩容、收缩操作。

<!-- more -->

# Redis的集群搭建

> 此案例在3台虚拟机上每台机搭建一个master主节点和一个slave从节点，共3个master节点，3个slave从节点，共计6个redis节点；（集群至少需要存在3个主节点，如果只有2个，则其中一个主节点挂了之后，只剩下一个主节点是无法为挂掉主节点的从节点进行选举的，具体原由下文的“集群的选举原理分析”里有详细说明）
>
> 三台虚拟机IP和端口分配如下：
>
> 192.168.3.39：8001、8004
>
> 192.168.3.129：8002、8005
>
> 192.168.3.130：8003、8006
>
> 
>
> 本文以 [redis的单机安装步骤.md](redis的单机安装步骤) 为基础进行集群搭建

## 搭建集群

### 1. 准备物理文件存储目录

   在第一台192.168.3.39虚拟机下创建其物理文件存储目录文件夹

   ```
   mkdir -p /home/yunze/bin/redis/redis-5.0.14/data/cluster
   ```

   ```
   cd /home/yunze/bin/redis/redis-5.0.14/data/cluster
   mkdir 8001 8004
   ```

   

### 2. 复制redis.conf配置文件

   ```
   cp redis.conf redis-cluster-8001.conf
   ```

   

### 3. 调整配置文件

   ```
   vim redis-cluster-8001.conf
   ```

   配置信息如下：

   ```properties
   # 端口设置
   port 8001
   
   # 设置redis为后台启动，也就是关闭会话窗口后不会自动关闭服务
   daemonize yes
   
   # 将端口号追加命名到pidfile配置的文件
   pidfile "/var/run/redis_cluster_8001.pid"
   logfile "cluster_8001.log"
   
   # 设置集群节点的数据文件存储路径
   dir "/home/yunze/bin/redis/redis-5.0.14/data/cluster/8001"
   
   # 启动集群模式
   cluster-enabled yes
   
   # 集群节点信息文件
   cluster-config-file nodes-8001.conf
   
   # 集群节点无法访问多少毫秒之后会被判定为故障
   cluster-node-timeout 15000
   
   # 注释掉bind配置，后续可改配置为局域网IP
   # bind 127.0.0.1
   
   # 关闭redis的自我保护模式，如果开启，则只有本机才可以访问redis
   protected-mode no
   
   # 开启AOF，每一次redis操作命令都会被追加到AOF文件末尾，当redis重新启动时，程序可以通过重新执行AOF文件中的命令来达到重建数据集的目的
   appendonly yes
   
   # 设置redis的访问密码
   requirepass foobared
   
   # 设置集群节点间的访问密码
   masterauth foobared
   ```

   192.168.3.39虚拟机的8001节点配置文件准备完毕！



### 4. 准备其他节点的配置文件

   ```
   cp redis-cluster-8001.conf redis-cluster-8004.conf
   
   vim redis-cluster-8004.conf
   
   # 可使用如下命令进行配置信息批量替换
   :%s/8001/8004/g
   ```

   **其他两台虚拟机同理，注意端口号调整，然后再重复上述1~4步操作即可！**



### 5. 关闭防火墙

   ```
   # 查看防火墙状态
   systemctl status firewalld
   
   # 关闭防火墙
   systemctl stop firewalld
   
   # 禁止防火墙开机自启动
   systemctl disable firewalld
   ```

**重点** ：

  如果不关闭防火墙，则需配置打开6个redis实例所配置的port端口和集群节点gossip通信端口（默认是redis端口号加上10000）；

   <u>例：redis配置的端口为6379，则gossip端口为16379；redis配置的端口为8001，则gossip端口为18001；</u>




### 6. 分别启动redis实例

   ```
   src/redis-server redis-cluster-8001.conf
   src/redis-server redis-cluster-8002.conf
   src/redis-server redis-cluster-8003.conf
   src/redis-server redis-cluster-8004.conf
   src/redis-server redis-cluster-8005.conf
   src/redis-server redis-cluster-8006.conf
   ```

   

### 7. 查看服务是否启动成功

   ```
   [yunze@localhost redis-5.0.14]$ ps -ef | grep redis
   yunze      4847      1  0 23:10 ?        00:00:02 src/redis-server *:8001 [cluster]
   yunze      4862      1  0 23:10 ?        00:00:02 src/redis-server *:8004 [cluster]
   yunze      5088   2809  0 23:27 pts/0    00:00:00 grep --color=auto redis
   ```

   


### 8. 使用redis-cli创建redis集群

   > **注意：集群创建成功之后，如果关闭了集群，下次不需要再重新执行该命令，将集群的各个实例分别启动起来即可；**

   ```
   src/redis-cli -a foobared --cluster create --cluster-replicas 1 192.168.3.39:8001 192.168.3.129:8002 192.168.3.130:8003 192.168.3.39:8004 192.168.3.129:8005 192.168.3.130:8006
   ```

`--cluster-replicas 1`意为集群里一个主节点的从节点数量限制为1；

   例：

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared --cluster create --cluster-replicas 1 192.168.3.39:8001 192.168.3.129:8002 192.168.3.130:8003 192.168.3.39:8004 192.168.3.129:8005 192.168.3.130:8006
   Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
   >>> Performing hash slots allocation on 6 nodes...
   Master[0] -> Slots 0 - 5460
   Master[1] -> Slots 5461 - 10922
   Master[2] -> Slots 10923 - 16383
   Adding replica 192.168.3.129:8005 to 192.168.3.39:8001
   Adding replica 192.168.3.130:8006 to 192.168.3.129:8002
   Adding replica 192.168.3.39:8004 to 192.168.3.130:8003
   M: 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001
      slots:[0-5460] (5461 slots) master
   M: 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002
      slots:[5461-10922] (5462 slots) master
   M: 68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003
      slots:[10923-16383] (5461 slots) master
   S: 4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004
      replicates 68b19c491aa909350896a0ce4be75c5ed8cb8dde
   S: 267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005
      replicates 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103
   S: 3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006
      replicates 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41
   Can I set the above configuration? (type 'yes' to accept): yes
   >>> Nodes configuration updated
   >>> Assign a different config epoch to each node
   >>> Sending CLUSTER MEET messages to join the cluster
   Waiting for the cluster to join
   ...
   >>> Performing Cluster Check (using node 192.168.3.39:8001)
   M: 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001
      slots:[0-5460] (5461 slots) master
      1 additional replica(s)
   S: 267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005
      slots: (0 slots) slave
      replicates 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103
   S: 4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004
      slots: (0 slots) slave
      replicates 68b19c491aa909350896a0ce4be75c5ed8cb8dde
   S: 3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006
      slots: (0 slots) slave
      replicates 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41
   M: 68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003
      slots:[10923-16383] (5461 slots) master
      1 additional replica(s)
   M: 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002
      slots:[5461-10922] (5462 slots) master
      1 additional replica(s)
   [OK] All nodes agree about slots configuration.
   >>> Check for open slots...
   >>> Check slots coverage...
   [OK] All 16384 slots covered.
   ```

   

### 9. 验证集群

   访问任意客户端即可

   ```
   src/redis-cli -a foobared -c -h 192.168.3.39 -p 8001
   ```

####   1. 查看集群信息

   ```
   192.168.3.39:8001> cluster info
   cluster_state:ok
   cluster_slots_assigned:16384
   cluster_slots_ok:16384
   cluster_slots_pfail:0
   cluster_slots_fail:0
   cluster_known_nodes:6
   cluster_size:3
   cluster_current_epoch:6
   cluster_my_epoch:1
   cluster_stats_messages_ping_sent:441
   cluster_stats_messages_pong_sent:470
   cluster_stats_messages_sent:911
   cluster_stats_messages_ping_received:465
   cluster_stats_messages_pong_received:441
   cluster_stats_messages_meet_received:5
   cluster_stats_messages_received:911
   ```

####   2. 查看集群节点列表

   ```
   192.168.3.39:8001> cluster nodes
   267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005@18005 slave 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 0 1691422958898 5 connected
   4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004@18004 slave 68b19c491aa909350896a0ce4be75c5ed8cb8dde 0 1691422958000 4 connected
   3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001@18001 myself,master - 0 1691422958000 1 connected 0-5460
   3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006@18006 slave 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 0 1691422957000 6 connected
   68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003@18003 master - 0 1691422956000 3 connected 10923-16383
   0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002@18002 master - 0 1691422957892 2 connected 5461-10922
   ```

   > 分析集群节点列表信息可以得到如下主从节点对应关系
   >
   > | 主节点（master）   | 从节点（slave）    |
   > | ------------------ | ------------------ |
   > | 192.168.3.39:8001  | 192.168.3.129:8005 |
   > | 192.168.3.129:8002 | 192.168.3.130:8006 |
   > | 192.168.3.130:8003 | 192.168.3.39:8004  |

   

####   3. 操作集群数据

   > 下列命令中由操作反馈可知`set a 1`的数据写入到了8003实例中，`set b 2`的数据写入到了8001实例中；
   >
   > 通过`keys *`命令也可以得到8001实例中只有`b`的值而没有`a`的值，这就是redis集群的分片存储；

   ```
   192.168.3.39:8001> set a 1
   -> Redirected to slot [15495] located at 192.168.3.130:8003
   OK
   192.168.3.130:8003> get a
   "1"
   192.168.3.130:8003> set b 2
   -> Redirected to slot [3300] located at 192.168.3.39:8001
   OK
   192.168.3.39:8001> get b
   "2"
   192.168.3.39:8001> keys *
   1) "b"
   ```

   

### 10. 关闭集群

逐个关闭实例

    src/redis-cli -a foobared -c -h 192.168.3.39 -p 8001 shutdown
    src/redis-cli -a foobared -c -h 192.168.3.39 -p 8004 shutdown
    src/redis-cli -a foobared -c -h 192.168.3.129 -p 8002 shutdown
    src/redis-cli -a foobared -c -h 192.168.3.129 -p 8005 shutdown
    src/redis-cli -a foobared -c -h 192.168.3.130 -p 8003 shutdown
    src/redis-cli -a foobared -c -h 192.168.3.130 -p 8006 shutdown
    ...

> 关闭后，再次启动只需执行各个实例的启动命令即可;
>
> 例：`src/redis-server redis-cluster-8001.conf`；





### 11. 使用Spring Boot整合redis进行验证

#### 1. 加入依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```



#### 2. application.yml配置

```yaml
   spring:
     redis:
       database: 0
       timeout: 3000
       # 集群模式
       cluster:
         nodes: 192.168.3.39:8001,192.168.3.39:8004,192.168.3.129:8002,192.168.3.129:8005,192.168.3.130:8003,192.168.3.130:8006
       # redis访问密码
       password: foobared
```




#### 3. 编写测试代码

```java
   import lombok.extern.slf4j.Slf4j;
   import org.springframework.beans.factory.annotation.Autowired;
   import org.springframework.data.redis.core.StringRedisTemplate;
   import org.springframework.web.bind.annotation.RequestMapping;
   import org.springframework.web.bind.annotation.RestController;
   
   /**
    * @author yunze
    * @date 2023/8/15 23:20
    */
   @Slf4j
   @RestController
   @RequestMapping("/demo")
   public class DemoController {
   
       @Autowired
       private StringRedisTemplate stringRedisTemplate;
   
       @RequestMapping("/test_cluster")
       public void testCluster() {
           int i = 1000;
           while (true) {
               try {
                   stringRedisTemplate.opsForValue().set("test-cluster-" + i, String.valueOf(i));
                   log.info("设置key：{}", "test-" + i);
                   Thread.sleep(1000);
                   String val = stringRedisTemplate.opsForValue().get("test-cluster-" + i);
                   i++;
                   log.info("获取{}值: {}", "test-" + i, val);
               } catch (Exception e) {
                   e.printStackTrace();
                   log.error("出现异常：{}", e.getMessage());
               }
           }
       }
   }
```



## 集群的水平扩展

1. 增加节点信息如下

   192.168.3.39：8007(master主节点)

   192.168.3.129：8008(slave从节点)

   192.168.3.130：8009(slave从节点)

   

2. 根据最初”redis的集群搭建“里的1~4步操作准备好新增节点信息和配置

   

3. 启动8007、8009实例

   ```
   src/redis-server redis-cluster-8007.conf
   src/redis-server redis-cluster-8008.conf
   src/redis-server redis-cluster-8009.conf
   ```

   

4. 将8007实例加入集群

   > 注意：需要保持8007节点里此时还没有数据，且还没有加入到其他集群，否则在加入的时候会失败，会提示如下信息（[ERR] Node 192.168.3.39:8007 is not empty. Either the node already knows other nodes (check with CLUSTER NODES) or contains some key in database 0.）
   >
   > 解决方法：进入8007节点执行如下两条命令
   >
   > 192.168.3.39:8007> flushall
   >
   > 192.168.3.39:8007> cluster reset

   执行命令`src/redis-cli -a foobared --cluster add-node new_host:new_port existing_host:existing_port`；其中foobared 为访问密码，new_host:new_port为新实例地址，existing_host:existing_port为已经存在于集群的实例地址（任意一个节点都可以）；

   如下所示：

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared --cluster add-node 192.168.3.39:8007 192.168.3.39:8001
   Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
   >>> Adding node 192.168.3.39:8007 to cluster 192.168.3.39:8001
   >>> Performing Cluster Check (using node 192.168.3.39:8001)
   M: 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001
      slots:[0-5460] (5461 slots) master
      1 additional replica(s)
   S: 4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004
      slots: (0 slots) slave
      replicates 68b19c491aa909350896a0ce4be75c5ed8cb8dde
   M: 68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003
      slots:[10923-16383] (5461 slots) master
      1 additional replica(s)
   S: 3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006
      slots: (0 slots) slave
      replicates 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41
   S: 267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005
      slots: (0 slots) slave
      replicates 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103
   M: 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002
      slots:[5461-10922] (5462 slots) master
      1 additional replica(s)
   [OK] All nodes agree about slots configuration.
   >>> Check for open slots...
   >>> Check slots coverage...
   [OK] All 16384 slots covered.
   >>> Send CLUSTER MEET to node 192.168.3.39:8007 to make it join the cluster.
   [OK] New node added correctly.
   ```

   此操作的用途为，让集群里的一个节点，发送meet给新加入的节点，邀请其加入集群；

   > gossip协议包含多种消息，包括ping，pong，meet，fail等等
   >
   > **gossip通信的10000端口** 
   >
   > 每个节点实例都有一个专门用于节点间gossip通信的端口，就是自己提供服务的端口号+10000，比如8001，那么 用于节点间通信的就是18001端口。 每个节点每隔一段时间都会往另外几个节点发送ping消息，同时其他几
   > 点接收到ping消息之后返回pong消息。
   >
   > meet：集群内的某个节点发送meet给新加入的节点，让新节点加入集群中，然后新节点就会开始与其他节点进行通信；
   >
   > ping：每个节点都会频繁给其他节点发送ping，其中包含自己的状态还有自己维护的集群元数据，互相通过 ping交换元数据(类似自己感知到的集群节点增加和移除，hash slot信息等);
   >
   > pong：对ping和meet消息的返回，包含自己的状态和其他信息，也可以用于信息广播和更新;
   >
   > fail：对ping和meet消息的返回，包含自己的状态和其他信息，也可以用于信息广播和更新；

   

5. 查看节点信息

   ```
   src/redis-cli -a foobared -c -h 192.168.3.39 -p 8001
   
   192.168.3.39:8001> cluster nodes
   4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004@18004 slave 68b19c491aa909350896a0ce4be75c5ed8cb8dde 0 1693238361500 4 connected
   68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003@18003 master - 0 1693238363508 3 connected 10923-16383
   3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006@18006 slave 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 0 1693238361000 6 connected
   267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005@18005 slave 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 0 1693238362503 12 connected
   3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001@18001 myself,master - 0 1693238363000 12 connected 0-5460
   0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002@18002 master - 0 1693238360000 2 connected 5461-10922
   3e10e499ae56381a78f402d5587a1d86b495b3d1 192.168.3.39:8007@18007 master - 0 1693238360000 0 connected
   ```

   由返回信息可看出，此时8007节点已经加入了集群；

   > 注意：此时8007实例节点还是处于无法访问的状态，因为他还没有槽位；
   >
   > 此时的8001节点槽位为 0 ~ 5460 ，8002节点的槽位为 5461 ~ 10922 ，8003节点的槽位为 10923 ~ 16383 ；

   

   > 槽位：redis集群会将所有数据划分为 16384 个 slots(槽位)，每个小集群的主节点负责其中一部分槽位。槽位的信息存储于每 个节点中；当客户端来连接集群时，客户端它也会得到一份集群的槽位配置信息并将其缓存在客户端本地。这样当客户端要查找某个 key 时，可以直接定位到这个key在某个槽位，这个槽位又在哪个节点上；
   >
   > 槽位定位算法：**HASH_SLOT = CRC16(key) mod 16384**，
   >
   > Cluster 默认会对 key 值使用 crc16 算法进行 hash 得到一个整数值，然后用这个整数值对 16384 进行取模 来得到具体槽位。

   

6. 将其他机器的槽位迁移到8007节点，为其他机器分担数据

   操作步骤如下所示：

   ```shell
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared --cluster reshard 192.168.3.39:8001
   Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
   >>> Performing Cluster Check (using node 192.168.3.39:8001)
   M: 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001
      slots:[0-5460] (5461 slots) master
      1 additional replica(s)
   M: 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002
      slots:[5461-10922] (5462 slots) master
      1 additional replica(s)
   S: 3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006
      slots: (0 slots) slave
      replicates 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41
   M: 68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003
      slots:[10923-16383] (5461 slots) master
      1 additional replica(s)
   S: 267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005
      slots: (0 slots) slave
      replicates 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103
   M: 3e10e499ae56381a78f402d5587a1d86b495b3d1 192.168.3.39:8007
      slots: (0 slots) master
   S: 4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004
      slots: (0 slots) slave
      replicates 68b19c491aa909350896a0ce4be75c5ed8cb8dde
   [OK] All nodes agree about slots configuration.
   >>> Check for open slots...
   >>> Check slots coverage...
   [OK] All 16384 slots covered.
   How many slots do you want to move (from 1 to 16384)? 500
   What is the receiving node ID? 3e10e499ae56381a78f402d5587a1d86b495b3d1
   Please enter all the source node IDs.
     Type 'all' to use all the nodes as source nodes for the hash slots.
     Type 'done' once you entered all the source nodes IDs.
   Source node #1: all
       Moving slot 11081 from 68b19c491aa909350896a0ce4be75c5ed8cb8dde
       Moving slot 11082 from 68b19c491aa909350896a0ce4be75c5ed8cb8dde
       Moving slot 11083 from 68b19c491aa909350896a0ce4be75c5ed8cb8dde
       ...
       Moving slot 11088 from 68b19c491aa909350896a0ce4be75c5ed8cb8dde
   Do you want to proceed with the proposed reshard plan (yes/no)? yes
   ```

   How many slots do you want to move (from 1 to 16384)? 500

   （ps:需要将8001节点的多少个槽位迁移到新的节点上，此处设置的500个）

   What is the receiving node ID? 3e10e499ae56381a78f402d5587a1d86b495b3d1

   （ps:需要将这500个槽位迁移到哪个节点上，此处设置的3e10e499ae56381a78f402d5587a1d86b495b3d1为8007实例节点的标识）

   Do you want to proceed with the proposed reshard plan (yes/no)? yes

   （ps:是否确认开始执行分片计划）

   

7. 查看集群最新节点信息

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared -c -h 192.168.3.39 -p 8001
   192.168.3.39:8001> cluster nodes
   0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002@18002 master - 0 1693400355000 17 connected 5628-10922
   3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006@18006 slave 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 0 1693400357857 17 connected
   68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003@18003 master - 0 1693400352000 16 connected 11089-16383
   3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001@18001 myself,master - 0 1693400354000 14 connected 166-5460
   267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005@18005 slave 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 0 1693400353000 14 connected
   3e10e499ae56381a78f402d5587a1d86b495b3d1 192.168.3.39:8007@18007 master - 0 1693400356846 18 connected 0-165 5461-5627 10923-11088
   4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004@18004 slave 68b19c491aa909350896a0ce4be75c5ed8cb8dde 0 1693400355837 16 connected
   ```

   可以看到8007实例节点的槽位为0-165、5461-5627、10923-11088

   进入到8007实例节点也可以看到很多数据也随着槽位迁移了过来

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared -c -h 192.168.3.39 -p 8007
   192.168.3.39:8007> keys *
    1) "test-cluster-688"
    2) "test-cluster-311"
    ...
   ```

   至此集群的节点扩展成功！

   

8. 将8008、8009实例加入到集群，并设置为8007实例的从节点

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared --cluster add-node 192.168.3.129:8008 192.168.3.39:8007 --cluster-slave
   >>> Adding node 192.168.3.129:8008 to cluster 192.168.3.39:8007
   >>> Performing Cluster Check (using node 192.168.3.39:8007)
   M: 3e10e499ae56381a78f402d5587a1d86b495b3d1 192.168.3.39:8007
      slots:[0-165],[5461-5627],[10923-11088] (499 slots) master
   M: 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001
      slots:[166-5460] (5295 slots) master
      1 additional replica(s)
   S: 267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005
      slots: (0 slots) slave
      replicates 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103
   S: 3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006
      slots: (0 slots) slave
      replicates 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41
   M: 68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003
      slots:[11089-16383] (5295 slots) master
      1 additional replica(s)
   M: 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002
      slots:[5628-10922] (5295 slots) master
      1 additional replica(s)
   S: 4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004
      slots: (0 slots) slave
      replicates 68b19c491aa909350896a0ce4be75c5ed8cb8dde
   [OK] All nodes agree about slots configuration.
   >>> Check for open slots...
   >>> Check slots coverage...
   [OK] All 16384 slots covered.
   Automatically selected master 192.168.3.39:8007
   >>> Send CLUSTER MEET to node 192.168.3.129:8008 to make it join the cluster.
   Waiting for the cluster to join
   
   >>> Configure node as replica of 192.168.3.39:8007.
   [OK] New node added correctly.
   ```

   

   8009同样操作

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared --cluster add-node 192.168.3.130:8009 192.168.3.39:8007 --cluster-slave
   ```

   

   查看最新节点信息

   从返回信息里可以看到8008和8009成为了8007节点的slave从节点

   ```
   [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared -c -h 192.168.3.39 -p 8007
   192.168.3.39:8007> cluster nodes
   3324378c7a09aa263564fbda842b7e502006a7c9 192.168.3.130:8006@18006 slave 0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 0 1693401841631 17 connected
   0a8c08e30cfa7e7d74b87e2a80d9785da6859e41 192.168.3.129:8002@18002 master - 0 1693401845000 17 connected 5628-10922
   1c9571a96ac7ebb387daedd5617f50c95d1deccd 192.168.3.130:8009@18009 slave 3e10e499ae56381a78f402d5587a1d86b495b3d1 0 1693401843000 18 connected
   3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 192.168.3.39:8001@18001 master - 0 1693401842000 14 connected 166-5460
   e933c3c4573dd2a20420f5d0240e5a22acbf5869 192.168.3.129:8008@18008 slave 3e10e499ae56381a78f402d5587a1d86b495b3d1 0 1693401845671 18 connected
   267be1f6daa96c102e683ab077ab4618df4e70e7 192.168.3.129:8005@18005 slave 3848be4f9e9b4f9e1887dcdbe0f5b641f2b05103 0 1693401844000 14 connected
   3e10e499ae56381a78f402d5587a1d86b495b3d1 192.168.3.39:8007@18007 myself,master - 0 1693401842000 18 connected 0-165 5461-5627 10923-11088
   68b19c491aa909350896a0ce4be75c5ed8cb8dde 192.168.3.130:8003@18003 master - 0 1693401844000 16 connected 11089-16383
   4b53f3e178f13b75edb65e5ec31c58985d54a4c1 192.168.3.39:8004@18004 slave 68b19c491aa909350896a0ce4be75c5ed8cb8dde 0 1693401844656 16 connected
   ```

   

9. redis集群移除节点

   执行如下命令：

   ```
   src/redis-cli -a <password> -c -h <node-ip> -p <node-port> cluster forget <node-id>
   ```

   password：集群访问密码

   node-ip：集群任一节点的ip地址

   node-port：集群一节点的端口

   node-id：需要移除的节点标识符

   

10. redis集群解散

    先清理各节点的数据

    ```
    src/redis-cli -a foobared -c -h 192.168.3.39 -p 8001
    192.168.3.39:8001> flushall
    
    src/redis-cli -a foobared -c -h 192.168.3.129 -p 8002
    192.168.3.129:8002> flushall
    
    src/redis-cli -a foobared -c -h 192.168.3.130 -p 8003
    192.168.3.130:8003> flushall
    
    [yunze@localhost redis-5.0.14]$ src/redis-cli -a foobared -c -h 192.168.3.39 -p 8001 cluster reset
    ```

    

11. 查看redis集群的命令帮助

```
[yunze@localhost redis-5.0.14]$ src/redis-cli --cluster help
Cluster Manager Commands:
  create         host1:port1 ... hostN:portN
                 --cluster-replicas <arg>
  check          host:port
                 --cluster-search-multiple-owners
  info           host:port
  fix            host:port
                 --cluster-search-multiple-owners
  reshard        host:port
                 --cluster-from <arg>
                 --cluster-to <arg>
                 --cluster-slots <arg>
                 --cluster-yes
                 --cluster-timeout <arg>
                 --cluster-pipeline <arg>
                 --cluster-replace
  rebalance      host:port
                 --cluster-weight <node1=w1...nodeN=wN>
                 --cluster-use-empty-masters
                 --cluster-timeout <arg>
                 --cluster-simulate
                 --cluster-pipeline <arg>
                 --cluster-threshold <arg>
                 --cluster-replace
  add-node       new_host:new_port existing_host:existing_port
                 --cluster-slave
                 --cluster-master-id <arg>
  del-node       host:port node_id
  call           host:port command arg arg .. arg
  set-timeout    host:port milliseconds
  import         host:port
                 --cluster-from <arg>
                 --cluster-copy
                 --cluster-replace
  help           

For check, fix, reshard, del-node, set-timeout you can specify the host and port of any working node in the cluster.
```





## FAQ    

### Redis集群对批量操作命令的支持 

对于类似mset，mget这样的多个key的原生批量操作命令，redis集群只支持所有key落在同一slot的情况，如果有多个key一定要用mset命令在redis集群上操作，则可以在key的前面加上{XX}，这样参数数据分片hash计 算的只会是大括号里的值，这样能确保不同的key能落到同一slot里去，示例如下： 

```
192.168.3.39:8007> mset {user}:1:name lisi {user}:1:sex 1 {user}:1:age 18
```

假设name和age计算的hash slot值不一样，但是这条命令在集群下执行，redis只会用大括号里的 user1做hash slot计算，所以算出来的slot值肯定相同，最后都能落在同一slot。



### 集群的选举原理分析

关闭集群的节点8007实例（8007实例为master主节点、8008、8009实例为slave从节点）时，8007实例节点在集群中的状态会变为fail。当8008、8009的slave实例节点发现自己的master主节点变成了fail，便会尝试failover机制。

> failover是redis cluster提供的容错机制，cluster最核心的功能之一。failover表现在一个master分片故障后，slave接管master的过程。
>
> 其支持两种模式：
>
> 1. 故障failover：自动恢复集群的可用性；
>
> 2. 人为failover：支持集群的可运维操作；

过程如下：

1. slave发现自己的master节点变为fail；
2. slave将自己记录的集群周期加1，及currentEpoch加1，并广播FAILOVER_AUTH_REQUEST信息；
3. 集群其他所有节点都会收到该信息，但是只有master主节点会进行响应，会判断请求者的合法性（发送请求的节点是否是8007主节点的slave从节点），并发送FILOVER_AUTH_ACK，每个master主节点对每一个epoch周期只发送一次ack；（例：8001实例接收到了8008和8009两个slave节点的FAILOVER_AUTH_REQUEST信息（假设8001先接收到8008节点的请求），但是8001这个master节点只会响应先接收的那个请求，即响应8008节点，对其发送FILOVER_AUTH_ACK信息；
4. 尝试failover的8008和8009 slave节点会收集各master节点返回的FILOVER_AUTH_ACK；
5. 如果某一slave收到了超过半数master节点的ack，就会变成该小集群里新的master节点；（集群至少要有3个主节点的原因）（如果8008和8009 **两个slave节点收到的都是刚好半数的master节点的ack，则会重新从第2步开始** ）
6. 该slave会广播pong消息通知其他集群节点终止选举；



从节点并不是在主节点一进入 FAIL 状态就马上尝试发起选举，而是有一定延迟，一定的延迟确保我们等待 FAIL状态在集群中传播，slave如果立即尝试选举，其它masters或许尚未意识到FAIL状态，可能会拒绝投票。

> 延迟计算公式： 
>
> DELAY = 500ms + random(0 ~ 500ms) + SLAVE_RANK * 1000ms
>
> 其中SLAVE_RANK表示此slave已经从master复制数据的总量的rank。Rank越小代表已复制的数据越新。这种方式下，理论上持有最新数据的slave将会首先发起选举，也是最有机会被选为新的主节点。



### 集群脑裂数据丢失问题

网络分区（一个小集群的master节点与其slave节点和整个大集群各节点网络不通了）导致脑裂后多个主节点对外提供写服务（一个小集群里有多个master主节点），一旦网络分区恢复， 会将其中一个主节点变为从节点，这时会有大量数据丢失。 

规避方法可以在redis配置里加上参数（这种方法不可能百分百避免数据丢失，参考集群leader选举机制）：

```properties
# 写数据成功最少同步的slave数量，这个数量可以模仿大于半数机制配置，比如 集群总共三个节点可以配置1，加上leader就是2，超过了半数
min‐replicas‐to‐write 1
```

> 注意：这个配置在一定程度上会影响集群的可用性，比如slave要是少于1个，这个集群就算leader正常也不能提供服务了，需要具体场景权衡选择