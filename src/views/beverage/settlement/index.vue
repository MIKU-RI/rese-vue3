<template>
  <div class="app-container">
    <el-form :model="queryParams" ref="queryRef" :inline="true" label-width="72px">
      <el-form-item label="类型" prop="bizType">
        <el-select v-model="queryParams.bizType" placeholder="全部" clearable style="width: 120px">
          <el-option label="收款" value="1" />
          <el-option label="付款" value="2" />
        </el-select>
      </el-form-item>
      <el-form-item label="往来单位" prop="counterpartyName">
        <el-input v-model="queryParams.counterpartyName" placeholder="名称模糊查询" clearable style="width: 180px"
          @keyup.enter="handleQuery" />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="正常" value="0" />
          <el-option label="已作废" value="1" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="handleQuery">搜索</el-button>
        <el-button icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Top" @click="openDialog('1')"
          v-hasPermi="['beverage:settlement:add']">收款登记</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Bottom" @click="openDialog('2')"
          v-hasPermi="['beverage:settlement:add']">付款登记</el-button>
      </el-col>
    </el-row>

    <el-table :data="list" v-loading="loading">
      <el-table-column label="流水号" prop="settlementId" width="90" />
      <el-table-column label="类型" width="80">
        <template #default="r">
          <el-tag :type="r.row.bizType === '1' ? 'success' : 'warning'">{{ r.row.bizType === '1' ? '收款' : '付款' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="往来单位" prop="counterpartyName" />
      <el-table-column label="关联单号" prop="relatedNo" width="160" />
      <el-table-column label="金额" align="right" width="120">
        <template #default="r"><span :style="{ color: r.row.bizType === '1' ? '#67c23a' : '#e6a23c', fontWeight: 700 }">¥ {{ Number(r.row.amount).toFixed(2) }}</span></template>
      </el-table-column>
      <el-table-column label="方式" width="90">
        <template #default="r">{{ payMethodText(r.row.payMethod) }}</template>
      </el-table-column>
      <el-table-column label="日期" prop="settleDate" width="120" />
      <el-table-column label="状态" width="90">
        <template #default="r">
          <el-tag :type="r.row.status === '1' ? 'info' : 'success'">{{ r.row.status === '1' ? '已作废' : '正常' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" prop="remark" show-overflow-tooltip />
      <el-table-column label="操作" width="90">
        <template #default="r">
          <el-button link type="danger" v-if="r.row.status !== '1'"
            @click="handleVoid(r.row)" v-hasPermi="['beverage:settlement:remove']">作废</el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <pagination v-show="total > 0" :total="total" v-model:page="queryParams.pageNum" v-model:limit="queryParams.pageSize"
      @pagination="getList" />

    <SettlementDialog v-model="dialogOpen" :biz-type="dialogBiz" @success="getList" />
  </div>
</template>

<script setup>
import { ref, reactive, getCurrentInstance, onMounted } from 'vue'
import { listSettlement, delSettlement } from '@/api/beverage/settlement'
import SettlementDialog from '@/views/beverage/components/SettlementDialog.vue'

const { proxy } = getCurrentInstance()

const loading = ref(false)
const list = ref([])
const total = ref(0)
const queryParams = reactive({ pageNum: 1, pageSize: 10, bizType: '', counterpartyName: '', status: '' })

const dialogOpen = ref(false)
const dialogBiz = ref('1')

function payMethodText(m) {
  return m === '2' ? '银行' : m === '3' ? '微信' : m === '4' ? '支付宝' : '现金'
}

function getList() {
  loading.value = true
  listSettlement(queryParams).then(res => {
    list.value = res.rows || []
    total.value = res.total || 0
  }).finally(() => { loading.value = false })
}

function handleQuery() {
  queryParams.pageNum = 1
  getList()
}

function resetQuery() {
  proxy.resetForm('queryRef')
  handleQuery()
}

function openDialog(biz) {
  dialogBiz.value = biz
  dialogOpen.value = true
}

function handleVoid(row) {
  proxy.$modal.confirm('确认作废该收付款单？作废后将回滚关联单据的已收/已付金额。').then(() => {
    return delSettlement(row.settlementId)
  }).then(() => {
    proxy.$modal.msgSuccess('已作废')
    getList()
  }).catch(() => {})
}

onMounted(() => getList())
</script>
