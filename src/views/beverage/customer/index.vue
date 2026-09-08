<template>
  <div class="app-container contact-book">
    <!-- 顶部工具条 -->
    <div class="cb-toolbar">
      <el-input
        v-model="searchText"
        placeholder="搜索门店 / 联系人 / 电话 / 地址"
        clearable
        prefix-icon="Search"
        class="cb-search"
        @input="onSearch"
      />
      <el-select v-model="activeCategory" placeholder="全部类型" class="cb-status">
        <el-option v-for="t in typeOptions" :key="t.value" :label="t.label" :value="t.value" />
        <el-option label="全部类型" value="all" />
      </el-select>
      <el-select v-model="statusFilter" placeholder="状态" clearable class="cb-status" @change="onSearch">
        <el-option label="全部状态" value="all" />
        <el-option label="正常" value="0" />
        <el-option label="停用" value="1" />
      </el-select>
      <el-button type="primary" icon="Plus" @click="handleAdd" v-hasPermi="['beverage:customer:add']">新增客户</el-button>
      <el-button type="warning" plain icon="Download" @click="handleExport" v-hasPermi="['beverage:customer:list']">导出</el-button>
    </div>

    <el-row :gutter="16" class="cb-body">
      <!-- 左侧分类导航 -->
      <el-col :span="5" class="cb-aside">
        <div class="cb-aside-title">客户分类</div>
        <div
          v-for="cat in navCategories"
          :key="cat.type"
          class="cb-cat"
          :class="{ active: activeCategory === cat.type }"
          @click="activeCategory = cat.type"
        >
          <span class="cb-cat-dot" :style="{ background: cat.color }"></span>
          <span class="cb-cat-label">{{ cat.label }}</span>
          <span class="cb-cat-count">{{ catCount(cat.type) }}</span>
        </div>
      </el-col>

      <!-- 右侧联系人列表 -->
      <el-col :span="19" class="cb-main">
        <div v-loading="loading">
          <div v-if="grouped.length === 0" class="cb-empty">
            <el-empty description="没有匹配的客户" />
          </div>

          <div v-for="group in grouped" :key="group.type" class="cb-group">
            <div class="cb-group-head">
              <span class="cb-group-dot" :style="{ background: group.color }"></span>
              <span class="cb-group-name">{{ group.label }}</span>
              <span class="cb-group-num">{{ group.list.length }} 位联系人</span>
            </div>

            <div class="cb-grid">
              <div
                v-for="c in group.list"
                :key="c.customerId"
                class="cb-card"
                @click="openDetail(c)"
              >
                <div class="cb-avatar" :style="{ background: group.color }">
                  {{ firstChar(c.customerName) }}
                </div>
                <div class="cb-info">
                  <div class="cb-name-row">
                    <span class="cb-name" :title="c.customerName">{{ c.customerName }}</span>
                    <el-tag size="small" :type="c.status === '0' ? 'success' : 'info'">
                      {{ c.status === '0' ? '正常' : '停用' }}
                    </el-tag>
                  </div>
                  <div class="cb-line">
                    <el-icon><User /></el-icon>
                    <span>{{ c.contact || '—' }}</span>
                  </div>
                  <div class="cb-line">
                    <el-icon><Phone /></el-icon>
                    <a class="cb-tel" :href="'tel:' + (c.phone || '')" @click.stop>{{ c.phone || '—' }}</a>
                  </div>
                  <div class="cb-line cb-addr" v-if="c.address">
                    <el-icon><Location /></el-icon>
                    <span :title="c.address">{{ c.address }}</span>
                  </div>
                </div>
                <div class="cb-actions" @click.stop>
                  <el-button
                    type="primary"
                    link
                    icon="Phone"
                    :disabled="!c.phone"
                    @click="callPhone(c.phone)"
                  >拨打</el-button>
                  <el-button type="primary" link icon="Edit" @click="handleUpdate(c)" v-hasPermi="['beverage:customer:edit']">修改</el-button>
                  <el-button type="danger" link icon="Delete" @click="handleDelete(c)" v-hasPermi="['beverage:customer:remove']">删除</el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 新增 / 修改 对话框 -->
    <el-dialog :title="title" v-model="open" width="700px" append-to-body>
      <el-form :model="form" :rules="rules" ref="customerRef" label-width="100px">
        <el-row>
          <el-col :span="12">
            <el-form-item label="门店名称" prop="customerName">
              <el-input v-model="form.customerName" placeholder="请输入门店名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户类型" prop="customerType">
              <el-select v-model="form.customerType" placeholder="请选择" style="width: 100%">
                <el-option v-for="dict in typeOptions" :key="dict.value" :label="dict.label" :value="dict.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="联系人" prop="contact">
              <el-input v-model="form.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="地址" prop="address">
              <el-input v-model="form.address" placeholder="请输入地址" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">正常</el-radio>
                <el-radio value="1">停用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" placeholder="请输入内容" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm">确 定</el-button>
          <el-button @click="cancel">取 消</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 客户详情抽屉 -->
    <el-drawer v-model="detailOpen" :title="detailRow.customerName || '客户详情'" size="360px" direction="rtl">
      <div v-if="detailRow.customerId" class="cb-detail">
        <div class="cb-detail-avatar" :style="{ background: typeMeta(detailRow.customerType).color }">
          {{ firstChar(detailRow.customerName) }}
        </div>
        <div class="cb-detail-name">{{ detailRow.customerName }}</div>
        <el-tag size="small" :type="detailRow.status === '0' ? 'success' : 'info'" class="cb-detail-tag">
          {{ detailRow.status === '0' ? '正常' : '停用' }}
        </el-tag>
        <el-tag size="small" effect="plain">{{ typeLabel(detailRow.customerType) }}</el-tag>

        <el-descriptions :column="1" border class="cb-detail-desc">
          <el-descriptions-item label="联系人">{{ detailRow.contact || '—' }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">
            <a class="cb-tel" :href="'tel:' + (detailRow.phone || '')">{{ detailRow.phone || '—' }}</a>
          </el-descriptions-item>
          <el-descriptions-item label="地址">{{ detailRow.address || '—' }}</el-descriptions-item>
          <el-descriptions-item label="备注">{{ detailRow.remark || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div class="cb-detail-actions">
          <el-button type="primary" icon="Phone" :disabled="!detailRow.phone" @click="callPhone(detailRow.phone)">拨打电话</el-button>
          <el-button icon="Edit" @click="handleUpdate(detailRow)" v-hasPermi="['beverage:customer:edit']">修改</el-button>
          <el-button type="danger" icon="Delete" @click="handleDelete(detailRow)" v-hasPermi="['beverage:customer:remove']">删除</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup name="BeverageCustomer">
import { listCustomer, getCustomer, delCustomer, addCustomer, updateCustomer } from "@/api/beverage/customer"
import { User, Phone, Location } from "@element-plus/icons-vue"

const { proxy } = getCurrentInstance()

const allCustomers = ref([])
const open = ref(false)
const detailOpen = ref(false)
const loading = ref(true)
const title = ref("")
const detailRow = ref({})

const searchText = ref("")
const activeCategory = ref("all")
const statusFilter = ref("all")

const typeOptions = ref([
  { label: '便利店', value: '0' },
  { label: '餐饮', value: '1' },
  { label: '其他', value: '2' }
])
const typeMetaMap = {
  '0': { label: '便利店', color: '#409EFF' },
  '1': { label: '餐饮', color: '#E6A23C' },
  '2': { label: '其他', color: '#909399' }
}
const navCategories = [
  { type: 'all', label: '全部客户', color: '#67C23A' },
  { type: '0', label: '便利店', color: '#409EFF' },
  { type: '1', label: '餐饮', color: '#E6A23C' },
  { type: '2', label: '其他', color: '#909399' }
]

const data = reactive({
  form: {},
  rules: {
    customerName: [{ required: true, message: "门店名称不能为空", trigger: "blur" }],
    phone: [{ required: true, message: "联系电话不能为空", trigger: "blur" }]
  }
})
const { form, rules } = toRefs(data)

function typeLabel(v) {
  return typeMetaMap[v] ? typeMetaMap[v].label : v
}
function typeMeta(v) {
  return typeMetaMap[v] || { label: v, color: '#909399' }
}
function firstChar(name) {
  return (name && name.trim().charAt(0)) || '?'
}
function catCount(type) {
  const base = allCustomers.value.filter(c => matchSearch(c) && matchStatus(c))
  if (type === 'all') return base.length
  return base.filter(c => c.customerType === type).length
}

// 基础过滤：搜索 + 状态
function matchSearch(c) {
  const kw = (searchText.value || '').trim().toLowerCase()
  if (!kw) return true
  return [c.customerName, c.contact, c.phone, c.address]
    .some(v => v && String(v).toLowerCase().includes(kw))
}
function matchStatus(c) {
  return statusFilter.value === 'all' || c.status === statusFilter.value
}

const filtered = computed(() => {
  return allCustomers.value.filter(c => matchSearch(c) && matchStatus(c) && (activeCategory.value === 'all' || c.customerType === activeCategory.value))
})

const grouped = computed(() => {
  const order = ['0', '1', '2']
  return order
    .filter(t => filtered.value.some(c => c.customerType === t))
    .map(t => ({
      type: t,
      label: typeMetaMap[t].label,
      color: typeMetaMap[t].color,
      list: filtered.value.filter(c => c.customerType === t)
    }))
})

function loadData() {
  loading.value = true
  listCustomer({ pageNum: 1, pageSize: 10000 }).then(res => {
    allCustomers.value = res.rows || []
    loading.value = false
  })
}

function onSearch() {
  // 客户端过滤，无需重新请求
}

function callPhone(phone) {
  if (phone) window.location.href = 'tel:' + phone
}

function openDetail(row) {
  detailRow.value = { ...row }
  detailOpen.value = true
}

function handleDelete(row) {
  const customerIds = row.customerId
  proxy.$modal.confirm('是否确认删除客户"' + (row.customerName || customerIds) + '"？').then(function () {
    return delCustomer(customerIds)
  }).then(() => {
    loadData()
    detailOpen.value = false
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    customerId: undefined,
    customerName: undefined,
    customerType: '0',
    contact: undefined,
    phone: undefined,
    address: undefined,
    status: '0',
    remark: undefined
  }
  proxy.resetForm("customerRef")
}

function cancel() {
  open.value = false
  reset()
}

/** 导出按钮操作 */
function handleExport() {
  proxy.download("beverage/customer/export", {}, `customer_${new Date().getTime()}.xlsx`)
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加客户"
}

function handleUpdate(row) {
  reset()
  const customerId = row.customerId
  getCustomer(customerId).then(res => {
    form.value = res.data
    open.value = true
    title.value = "修改客户"
  })
}

function submitForm() {
  proxy.$refs["customerRef"].validate(valid => {
    if (valid) {
      if (form.value.customerId != undefined) {
        updateCustomer(form.value).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          loadData()
        })
      } else {
        addCustomer(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          loadData()
        })
      }
    }
  })
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.contact-book {
  .cb-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    .cb-search { width: 320px; }
    .cb-status { width: 150px; }
  }

  .cb-body { align-items: stretch; }

  .cb-aside {
    background: var(--el-fill-color-blank);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 12px;
    height: fit-content;

    .cb-aside-title {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      margin-bottom: 8px;
      padding-left: 4px;
    }
    .cb-cat {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: background 0.2s;
      &:hover { background: var(--el-fill-color-light); }
      &.active {
        background: var(--el-color-primary-light-9);
        .cb-cat-label { color: var(--el-color-primary); font-weight: 600; }
      }
      .cb-cat-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 10px;
        flex-shrink: 0;
      }
      .cb-cat-label { flex: 1; font-size: 14px; }
      .cb-cat-count {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        background: var(--el-fill-color-light);
        border-radius: 10px;
        padding: 0 8px;
        min-width: 24px;
        text-align: center;
      }
    }
  }

  .cb-main { min-height: 400px; }

  .cb-empty { padding: 60px 0; }

  .cb-group { margin-bottom: 22px; }
  .cb-group-head {
    display: flex;
    align-items: center;
    margin-bottom: 12px;
    .cb-group-dot { width: 12px; height: 12px; border-radius: 3px; margin-right: 8px; }
    .cb-group-name { font-size: 15px; font-weight: 600; }
    .cb-group-num { font-size: 12px; color: var(--el-text-color-secondary); margin-left: 8px; }
  }

  .cb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }

  .cb-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-blank);
    cursor: pointer;
    transition: box-shadow 0.2s, transform 0.2s;
    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      transform: translateY(-2px);
    }
    .cb-avatar {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      color: #fff;
      font-size: 18px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .cb-info { flex: 1; min-width: 0; }
    .cb-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      .cb-name {
        font-size: 15px;
        font-weight: 600;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .cb-line {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--el-text-color-regular);
      line-height: 1.8;
      .el-icon { color: var(--el-text-color-secondary); }
      &.cb-addr span {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .cb-tel { color: var(--el-color-primary); text-decoration: none; &:hover { text-decoration: underline; } }
    .cb-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
      flex-shrink: 0;
    }
  }

  .cb-detail {
    text-align: center;
    .cb-detail-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      color: #fff;
      font-size: 30px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 12px;
    }
    .cb-detail-name { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .cb-detail-tag { margin-right: 6px; }
    .cb-detail-desc { margin-top: 18px; text-align: left; }
    .cb-detail-actions {
      margin-top: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
    }
  }
}
</style>
