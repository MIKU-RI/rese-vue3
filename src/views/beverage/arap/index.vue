<template>
  <div class="app-container">
    <el-row :gutter="10" class="mb8">
      <el-col :span="1.5">
        <el-button type="primary" plain icon="Top" @click="openDialog('1', null)"
          v-hasPermi="['beverage:settlement:add']">收款登记</el-button>
      </el-col>
      <el-col :span="1.5">
        <el-button type="success" plain icon="Bottom" @click="openDialog('2', null)"
          v-hasPermi="['beverage:settlement:add']">付款登记</el-button>
      </el-col>
    </el-row>

    <el-tabs v-model="activeTab" @tab-change="loadData">
      <!-- 应收 -->
      <el-tab-pane label="应收（客户）" name="receivable">
        <el-table :data="receivable" v-loading="loading" @expand-change="onExpand" row-key="counterpartyId">
          <el-table-column type="expand">
            <template #default="props">
              <el-table :data="docMap[props.row.counterpartyId] || []" size="small" style="margin: 0 40px">
                <el-table-column label="销售单号" prop="saleNo" />
                <el-table-column label="日期" prop="saleDate" width="120" />
                <el-table-column label="应收总额" align="right" :formatter="fmtMoney" />
                <el-table-column label="已收" align="right" :formatter="fmtMoney2" />
                <el-table-column label="未收" align="right" width="120">
                  <template #default="s"><span style="color:#f56c6c">¥{{ (Number(s.row.totalAmount) - Number(s.row.paidAmount)).toFixed(2) }}</span></template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="s"><el-tag :type="settleTag(s.row.settleStatus)">{{ settleText(s.row.settleStatus) }}</el-tag></template>
                </el-table-column>
              </el-table>
            </template>
          </el-table-column>
          <el-table-column label="客户" prop="counterpartyName" />
          <el-table-column label="单据数" prop="billCount" width="90" align="center" />
          <el-table-column label="应收总额" align="right" :formatter="fmtMoney" />
          <el-table-column label="已收" align="right" :formatter="fmtMoney2" />
          <el-table-column label="未收" align="right" width="130">
            <template #default="r"><span style="color:#f56c6c;font-weight:700">¥{{ Number(r.row.unpaid).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="r"><el-tag :type="settleTag(r.row.settleStatus)">{{ settleText(r.row.settleStatus) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="r">
              <el-button link type="primary" @click="openDialog('1', r.row.counterpartyId)"
                v-hasPermi="['beverage:settlement:add']">收款</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>

      <!-- 应付 -->
      <el-tab-pane label="应付（供应商）" name="payable">
        <el-table :data="payable" v-loading="loading" @expand-change="onExpand" row-key="counterpartyId">
          <el-table-column type="expand">
            <template #default="props">
              <el-table :data="docMap[props.row.counterpartyId] || []" size="small" style="margin: 0 40px">
                <el-table-column label="采购单号" prop="purchaseNo" />
                <el-table-column label="日期" prop="purchaseDate" width="120" />
                <el-table-column label="应付总额" align="right" :formatter="fmtMoney" />
                <el-table-column label="已付" align="right" :formatter="fmtMoney2" />
                <el-table-column label="未付" align="right" width="120">
                  <template #default="s"><span style="color:#f56c6c">¥{{ (Number(s.row.totalAmount) - Number(s.row.paidAmount)).toFixed(2) }}</span></template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                  <template #default="s"><el-tag :type="settleTag(s.row.settleStatus)">{{ settleText(s.row.settleStatus) }}</el-tag></template>
                </el-table-column>
              </el-table>
            </template>
          </el-table-column>
          <el-table-column label="供应商" prop="counterpartyName" />
          <el-table-column label="单据数" prop="billCount" width="90" align="center" />
          <el-table-column label="应付总额" align="right" :formatter="fmtMoney" />
          <el-table-column label="已付" align="right" :formatter="fmtMoney2" />
          <el-table-column label="未付" align="right" width="130">
            <template #default="r"><span style="color:#f56c6c;font-weight:700">¥{{ Number(r.row.unpaid).toFixed(2) }}</span></template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="r"><el-tag :type="settleTag(r.row.settleStatus)">{{ settleText(r.row.settleStatus) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="r">
              <el-button link type="success" @click="openDialog('2', r.row.counterpartyId)"
                v-hasPermi="['beverage:settlement:add']">付款</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>

    <SettlementDialog v-model="dialogOpen" :biz-type="dialogBiz" :preset-counterparty-id="dialogCpId" @success="loadData" />
  </div>
</template>

<script setup>
import { ref, getCurrentInstance, onMounted } from 'vue'
import { receivableList, payableList } from '@/api/beverage/arap'
import { listSale } from '@/api/beverage/sale'
import { listPurchase } from '@/api/beverage/purchase'
import SettlementDialog from '@/views/beverage/components/SettlementDialog.vue'

const { proxy } = getCurrentInstance()

const activeTab = ref('receivable')
const loading = ref(false)
const receivable = ref([])
const payable = ref([])
const docMap = ref({})

const dialogOpen = ref(false)
const dialogBiz = ref('1')
const dialogCpId = ref(null)

const fmtMoney = (r, c, v) => '¥ ' + Number(v || 0).toFixed(2)
const fmtMoney2 = (r, c, v) => '¥ ' + Number(v || 0).toFixed(2)

function settleText(s) {
  return s === '2' ? '已清' : s === '1' ? '部分' : '未结'
}
function settleTag(s) {
  return s === '2' ? 'success' : s === '1' ? 'primary' : 'warning'
}

function loadData() {
  loading.value = true
  const req = activeTab.value === 'receivable' ? receivableList() : payableList()
  req.then(res => {
    if (activeTab.value === 'receivable') receivable.value = res.data || []
    else payable.value = res.data || []
  }).finally(() => { loading.value = false })
}

function onExpand(row, expandedRows) {
  if (!expandedRows || expandedRows.length === 0) return
  if (docMap.value[row.counterpartyId]) return
  if (activeTab.value === 'receivable') {
    listSale({ customerId: row.counterpartyId, status: '1', pageNum: 1, pageSize: 9999 }).then(res => {
      docMap.value[row.counterpartyId] = res.rows || []
    })
  } else {
    listPurchase({ supplierId: row.counterpartyId, status: '1', pageNum: 1, pageSize: 9999 }).then(res => {
      docMap.value[row.counterpartyId] = res.rows || []
    })
  }
}

function openDialog(biz, cpId) {
  dialogBiz.value = biz
  dialogCpId.value = cpId
  dialogOpen.value = true
}

onMounted(() => loadData())
</script>
