<template>
  <div class="app-container product-gallery">
    <el-row :gutter="16">
      <!-- 左侧：品牌分类导航 -->
      <el-col :xs="24" :sm="7" :md="6" :lg="5">
        <el-card shadow="never" class="brand-nav" body-style="padding: 8px 0;">
          <div class="brand-nav__title">品牌分类</div>
          <ul class="brand-list">
            <li :class="['brand-item', { active: activeBrand === '' }]" @click="activeBrand = ''">
              <span class="brand-item__name">全部商品</span>
              <span class="brand-item__count">{{ productList.length }}</span>
            </li>
            <li
              v-for="b in brandList"
              :key="b.brand"
              :class="['brand-item', { active: activeBrand === b.brand }]"
              @click="activeBrand = b.brand"
            >
              <span class="brand-item__dot" :style="{ background: brandColor(b.brand) }"></span>
              <span class="brand-item__name">{{ b.brand }}</span>
              <span class="brand-item__count">{{ b.count }}</span>
              <el-tooltip content="进入该品牌调价" placement="top">
                <el-button
                  class="brand-item__price"
                  size="small"
                  type="warning"
                  link
                  icon="Money"
                  @click.stop="goBrandPrice(b.brand)"
                >调价</el-button>
              </el-tooltip>
              <el-tooltip content="进入该品牌调库存" placement="top">
                <el-button
                  class="brand-item__stock"
                  size="small"
                  type="success"
                  link
                  icon="Box"
                  @click.stop="goBrandStock(b.brand)"
                  v-hasPermi="['beverage:product:stock']"
                >调库存</el-button>
              </el-tooltip>
            </li>
            <li v-if="brandList.length === 0" class="brand-item brand-item--empty">暂无品牌</li>
          </ul>
        </el-card>
      </el-col>

      <!-- 右侧：商品卡片网格 -->
      <el-col :xs="24" :sm="17" :md="18" :lg="19">
        <el-card shadow="never" class="toolbar-card">
          <div class="toolbar">
            <el-input
              v-model="keyword"
              placeholder="搜索商品名称 / 条码"
              clearable
              style="width: 240px"
              @input="applyFilter"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
            <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 130px" @change="applyFilter">
              <el-option label="在售" value="0" />
              <el-option label="已下架" value="1" />
            </el-select>
            <el-radio-group v-model="sortBy" size="default" @change="applyFilter">
              <el-radio-button label="综合" value="id" />
              <el-radio-button label="库存升序" value="stockAsc" />
              <el-radio-button label="库存降序" value="stockDesc" />
            </el-radio-group>
            <div class="toolbar__right">
              <el-button icon="Refresh" @click="getList">刷新</el-button>
              <el-button type="warning" plain icon="Money" @click="goBrandPrice()">品牌调价</el-button>
              <el-button type="success" plain icon="Box" @click="goBrandStock()" v-hasPermi="['beverage:product:stock']">品牌库存</el-button>
              <el-button type="primary" icon="Plus" @click="handleAdd" v-hasPermi="['beverage:product:add']">新增商品</el-button>
            </div>
          </div>
        </el-card>

        <div v-loading="loading" class="card-grid">
          <div
            v-for="p in filteredList"
            :key="p.productId"
            class="product-card"
            @click="openDetail(p)"
          >
            <div class="product-card__media">
              <img v-if="p.image" :src="imgUrl(p.image)" class="product-card__img" alt="商品图" />
              <div v-else class="product-card__placeholder" :style="{ background: brandColor(p.brand) }">
                {{ (p.productName || '?').charAt(0) }}
              </div>
              <span v-if="p.status === '1'" class="product-card__off">已下架</span>
              <span v-if="isLow(p)" class="product-card__warn">库存预警</span>
              <div class="product-card__actions" @click.stop>
                <el-button size="small" type="primary" link icon="Edit" @click="handleUpdate(p)" v-hasPermi="['beverage:product:edit']">修改</el-button>
                <el-button size="small" type="success" link icon="Box" @click="openStockAdjust(p)" v-hasPermi="['beverage:product:stock']">调库存</el-button>
                <el-button size="small" type="danger" link icon="Delete" @click="handleDelete(p)" v-hasPermi="['beverage:product:remove']">删除</el-button>
              </div>
            </div>
            <div class="product-card__body">
              <div class="product-card__name" :title="p.productName">{{ p.productName }}</div>
              <div class="product-card__meta">
                <el-tag size="small" :type="brandTagType(p.brand)">{{ p.brand }}</el-tag>
                <span class="product-card__spec">{{ p.spec }} / {{ p.unit }}</span>
              </div>
              <div class="product-card__price">
                <span class="price-sale">¥{{ formatMoney(p.salePrice) }}</span>
                <span class="price-cost">进 ¥{{ formatMoney(p.purchasePrice) }}</span>
              </div>
              <div class="product-card__stock">
                <span>库存 {{ p.stock }} {{ p.unit }}</span>
                <span v-if="isLow(p)" class="stock-low">预警 {{ p.warnStock }}</span>
              </div>
            </div>
          </div>

          <div v-if="!loading && filteredList.length === 0" class="empty-tip">
            <el-empty description="没有匹配的商品" />
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailOpen" title="商品详情" size="420px" append-to-body>
      <div v-if="current" class="detail">
        <div class="detail__media">
          <img v-if="current.image" :src="imgUrl(current.image)" class="detail__img" alt="商品图" />
          <div v-else class="detail__placeholder" :style="{ background: brandColor(current.brand) }">
            {{ (current.productName || '?').charAt(0) }}
          </div>
        </div>
        <h3 class="detail__name">{{ current.productName }}</h3>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="品牌">{{ current.brand }}</el-descriptions-item>
          <el-descriptions-item label="规格">{{ current.spec }}</el-descriptions-item>
          <el-descriptions-item label="单位">{{ current.unit }}</el-descriptions-item>
          <el-descriptions-item label="条码">{{ current.barcode || '—' }}</el-descriptions-item>
          <el-descriptions-item label="进货价">¥{{ formatMoney(current.purchasePrice) }}</el-descriptions-item>
          <el-descriptions-item label="销售价">¥{{ formatMoney(current.salePrice) }}</el-descriptions-item>
          <el-descriptions-item label="库存">
            {{ current.stock }} {{ current.unit }}
            <el-tag v-if="isLow(current)" size="small" type="danger">预警 {{ current.warnStock }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="current.status === '0' ? 'success' : 'info'">
              {{ current.status === '0' ? '在售' : '已下架' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ current.remark || '—' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button icon="Box" type="success" @click="openStockAdjust(current)" v-hasPermi="['beverage:product:stock']">调整库存</el-button>
        <el-button icon="Edit" @click="handleUpdate(current)" v-hasPermi="['beverage:product:edit']">修改</el-button>
        <el-button icon="Delete" type="danger" @click="handleDelete(current)" v-hasPermi="['beverage:product:remove']">删除</el-button>
      </template>
    </el-drawer>

    <!-- 新增 / 修改 对话框 -->
    <el-dialog :title="title" v-model="open" width="720px" append-to-body @closed="onDialogClosed">
      <el-form :model="form" :rules="rules" ref="productRef" label-width="100px">
        <el-row>
          <el-col :span="14">
            <el-form-item label="商品名称" prop="productName">
              <el-input v-model="form.productName" placeholder="请输入商品名称" />
            </el-form-item>
            <el-row>
              <el-col :span="12">
                <el-form-item label="品牌" prop="brand">
                  <el-select v-model="form.brand" placeholder="请选择品牌" filterable style="width: 100%">
                    <el-option
                      v-for="o in beverage_brand"
                      :key="o.value"
                      :label="o.label"
                      :value="o.value"
                    />
                  </el-select>
                  <div class="form-tip">品牌在「系统管理 → 字典管理 → 饮料品牌」中维护</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="规格" prop="spec">
                  <el-input v-model="form.spec" placeholder="如 500ml/瓶" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="8">
                <el-form-item label="单位" prop="unit">
                  <el-input v-model="form.unit" placeholder="箱/瓶/提" />
                </el-form-item>
              </el-col>
              <el-col :span="16">
                <el-form-item label="条码" prop="barcode">
                  <el-input v-model="form.barcode" placeholder="选填" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="进货价" prop="purchasePrice">
                  <el-input-number v-model="form.purchasePrice" :precision="2" :min="0" :step="0.5" :controls-position="'right'" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="销售价" prop="salePrice">
                  <el-input-number v-model="form.salePrice" :precision="2" :min="0" :step="0.5" :controls-position="'right'" style="width: 100%" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="预警阈值" prop="warnStock">
                  <el-input-number v-model="form.warnStock" :min="0" :step="1" :precision="0" :controls-position="'right'" style="width: 100%" />
                </el-form-item>
                <div class="form-tip">库存数量请通过「调整库存」功能修改，系统会自动生成库存台账记录</div>
              </el-col>
            </el-row>
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio value="0">在售</el-radio>
                <el-radio value="1">下架</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入内容" />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item label="商品图片" prop="image" label-width="100px">
              <image-upload v-model="form.image" :limit="1" :file-size="5" :drag="false" />
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

    <!-- 调整库存（单品，生成库存台账记录，仅超管） -->
    <el-dialog title="调整库存" v-model="stockOpen" width="460px" append-to-body @closed="stockTarget = null">
      <div v-if="stockTarget" class="stock-adjust">
        <div class="stock-adjust__head">
          <b>{{ stockTarget.productName }}</b>
          <span class="stock-adjust__meta">{{ stockTarget.spec }} / {{ stockTarget.unit }}</span>
        </div>
        <el-descriptions :column="1" border size="small" style="margin: 12px 0">
          <el-descriptions-item label="当前库存">{{ stockTarget.stock }} {{ stockTarget.unit }}</el-descriptions-item>
        </el-descriptions>
        <el-form label-width="92px">
          <el-form-item label="调整后库存">
            <el-input-number v-model="stockTarget.newStock" :min="0" :step="1" :precision="0" :controls-position="'right'" style="width: 100%" />
            <div class="form-tip">本次变动：{{ stockDelta > 0 ? '+' : '' }}{{ stockDelta }} {{ stockTarget.unit }}；保存后会生成一条「盘点」库存台账记录</div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitStockAdjust">确 定</el-button>
          <el-button @click="stockOpen = false">取 消</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup name="BeverageProduct">
import { listProduct, getProduct, delProduct, addProduct, updateProduct, updateProductStock } from "@/api/beverage/product"
import ImageUpload from "@/components/ImageUpload"
import { useDict } from "@/utils/dict"
import { isExternal } from "@/utils/validate"
import useUserStore from "@/store/modules/user"

const { proxy } = getCurrentInstance()
const baseUrl = import.meta.env.VITE_APP_BASE_API

// 品牌字典（饮料品牌，可在 系统管理→字典管理 配置）
const { beverage_brand } = useDict('beverage_brand')

// 库存调整权限：仅超管（*:*:* 或 beverage:product:stock）
const hasStockPerm = computed(() => {
  const perms = useUserStore().permissions || []
  return perms.some(p => p === '*:*:*' || p === 'beverage:product:stock')
})

const productList = ref([])      // 全量
const filteredList = ref([])     // 过滤后展示
const loading = ref(true)
const open = ref(false)
const detailOpen = ref(false)
const title = ref("")
const current = ref(null)

const keyword = ref("")
const statusFilter = ref("")
const sortBy = ref("id")
const activeBrand = ref("")

const brandPalette = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#9254DE', '#13C2C2', '#EB2F96']
function brandColor(name) {
  if (!name) return '#909399'
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return brandPalette[h % brandPalette.length]
}
function isExternalUrl(url) {
  return isExternal(url)
}
function imgUrl(image) {
  if (!image) return ''
  if (isExternalUrl(image) || image.startsWith('http')) return image
  return baseUrl + image
}

const brandList = computed(() => {
  // 计数：按商品实际品牌统计
  const counts = {}
  productList.value.forEach(p => {
    const b = p.brand || ''
    if (b) counts[b] = (counts[b] || 0) + 1
  })
  // 导航项由字典驱动：配置的品牌都会出现（含 0 件），便于直接按品牌筛选
  const seen = new Set()
  const list = (beverage_brand.value || []).map(o => {
    seen.add(o.value)
    return { brand: o.value, label: o.label, count: counts[o.value] || 0 }
  })
  // 兜底：数据中存在但字典未配置的（孤儿）品牌也列出，避免无法筛选
  Object.keys(counts).forEach(b => {
    if (!seen.has(b)) list.push({ brand: b, label: b, count: counts[b] })
  })
  return list
})

// 品牌标签颜色：优先用字典项配置的 listClass，否则兜底
function brandTagType(name) {
  const opt = (beverage_brand.value || []).find(o => o.value === name)
  return opt && opt.elTagType ? opt.elTagType : ''
}

function isLow(p) {
  return p && p.warnStock != null && p.stock != null && Number(p.stock) <= Number(p.warnStock)
}
function formatMoney(val) {
  if (val == null) return '0.00'
  return Number(val).toFixed(2)
}

// 进入品牌单价管理：不传 brand 时打开品牌列表，传入则直达该品牌价格表
function goBrandPrice(brand) {
  proxy.$router.push({ path: '/beverage/brandPrice', query: brand ? { brand } : {} })
}

// 进入品牌库存管理：不传 brand 时打开品牌列表，传入则直达该品牌库存表
function goBrandStock(brand) {
  proxy.$router.push({ path: '/beverage/brandStock', query: brand ? { brand } : {} })
}

function applyFilter() {
  let list = productList.value.slice()
  if (activeBrand.value) list = list.filter(p => (p.brand || '未分类') === activeBrand.value)
  if (statusFilter.value) list = list.filter(p => p.status === statusFilter.value)
  if (keyword.value) {
    const k = keyword.value.trim().toLowerCase()
    list = list.filter(p =>
      (p.productName || '').toLowerCase().includes(k) ||
      (p.barcode || '').toLowerCase().includes(k)
    )
  }
  if (sortBy.value === 'stockAsc') list.sort((a, b) => Number(a.stock) - Number(b.stock))
  else if (sortBy.value === 'stockDesc') list.sort((a, b) => Number(b.stock) - Number(a.stock))
  else list.sort((a, b) => Number(b.productId) - Number(a.productId))
  filteredList.value = list
}

const data = reactive({
  form: {},
  rules: {
    productName: [{ required: true, message: "商品名称不能为空", trigger: "blur" }],
    brand: [{ required: true, message: "品牌不能为空", trigger: "blur" }]
  }
})
const { form, rules } = toRefs(data)

function getList() {
  loading.value = true
  listProduct({ pageNum: 1, pageSize: 10000 }).then(res => {
    productList.value = res.rows || []
    loading.value = false
    applyFilter()
  })
}

function openDetail(row) {
  current.value = row
  detailOpen.value = true
}

function handleDelete(row) {
  const id = row.productId
  proxy.$modal.confirm('是否确认删除商品"' + (row.productName || id) + '"？').then(function () {
    return delProduct(id)
  }).then(() => {
    getList()
    proxy.$modal.msgSuccess("删除成功")
  }).catch(() => {})
}

function reset() {
  form.value = {
    productId: undefined,
    productName: undefined,
    brand: undefined,
    spec: undefined,
    unit: '箱',
    barcode: undefined,
    image: undefined,
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    warnStock: 0,
    status: '0',
    remark: undefined
  }
  proxy.resetForm("productRef")
}
function cancel() {
  open.value = false
  reset()
}
function onDialogClosed() {
  // 关闭后重置，避免 ImageUpload 缓存
  reset()
}

function handleAdd() {
  reset()
  open.value = true
  title.value = "添加商品"
}
function handleUpdate(row) {
  const id = row && row.productId ? row.productId : (current.value ? current.value.productId : undefined)
  if (!id) return
  detailOpen.value = false
  getProduct(id).then(res => {
    form.value = res.data
    if (form.value.image == null) form.value.image = undefined
    open.value = true
    title.value = "修改商品"
  })
}

function submitForm() {
  proxy.$refs["productRef"].validate(valid => {
    if (valid) {
      if (form.value.productId != undefined) {
        // 编辑：库存统一通过「调整库存」修改并生成台账，此处剔除 stock 避免静默改库存
        const payload = { ...form.value }
        delete payload.stock
        updateProduct(payload).then(() => {
          proxy.$modal.msgSuccess("修改成功")
          open.value = false
          getList()
        })
      } else {
        addProduct(form.value).then(() => {
          proxy.$modal.msgSuccess("新增成功")
          open.value = false
          getList()
        })
      }
    }
  })
}

/* ---------------- 调整库存（单品，生成台账） ---------------- */
const stockOpen = ref(false)
const stockTarget = ref(null)
const stockDelta = computed(() => {
  if (!stockTarget.value) return 0
  return (Number(stockTarget.value.newStock) || 0) - (Number(stockTarget.value.stock) || 0)
})
function openStockAdjust(row) {
  const id = row && row.productId ? row.productId : (current.value ? current.value.productId : undefined)
  if (!id) return
  detailOpen.value = false
  getProduct(id).then(res => {
    const p = res.data
    stockTarget.value = { ...p, newStock: Number(p.stock) || 0 }
    stockOpen.value = true
  })
}
function submitStockAdjust() {
  if (!stockTarget.value) return
  const target = Number(stockTarget.value.newStock) || 0
  if (target < 0) {
    proxy.$modal.msgError("库存不能为负数")
    return
  }
  const id = stockTarget.value.productId
  const current = Number(stockTarget.value.stock) || 0
  if (target === current) {
    proxy.$modal.msgWarning("库存没有变化")
    return
  }
  updateProductStock([{ productId: id, stock: target }]).then(() => {
    proxy.$modal.msgSuccess("已调整库存并生成台账记录")
    stockOpen.value = false
    getList()
  }).catch(() => {})
}

watch(activeBrand, applyFilter)

onMounted(() => {
  getList()
})
</script>

<style scoped lang="scss">
.product-gallery {
  .brand-nav {
    margin-bottom: 16px;
    &__title {
      padding: 10px 16px;
      font-weight: 600;
      font-size: 14px;
      color: var(--el-text-color-primary);
      border-bottom: 1px solid var(--el-border-color-lighter);
    }
    .brand-list {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      .brand-item {
        display: flex;
        align-items: center;
        padding: 9px 16px;
        cursor: pointer;
        font-size: 14px;
        color: var(--el-text-color-regular);
        transition: background 0.2s;
        &:hover { background: var(--el-fill-color-light); }
        &.active {
          background: var(--el-color-primary-light-9);
          color: var(--el-color-primary);
          font-weight: 600;
        }
        &__dot {
          width: 8px; height: 8px; border-radius: 50%;
          margin-right: 8px; flex: none;
        }
        &__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        &__count {
          font-size: 12px;
          color: var(--el-text-color-secondary);
          background: var(--el-fill-color);
          border-radius: 10px;
          padding: 0 8px;
          min-width: 22px;
          text-align: center;
        }
        &__price { flex: none; margin-left: 6px; display: none; }
        &:hover &__price { display: inline-flex; }
        &__stock { flex: none; margin-left: 2px; display: none; }
        &:hover &__stock { display: inline-flex; }
        &--empty { color: var(--el-text-color-secondary); cursor: default; justify-content: center; }
      }
    }
  }

  .toolbar-card { margin-bottom: 16px; }

  .form-tip {
    font-size: 12px;
    line-height: 1.4;
    color: var(--el-text-color-secondary);
    margin-top: 2px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    &__right { margin-left: auto; display: flex; gap: 8px; }
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    min-height: 200px;
    align-content: start;
  }

  .product-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.18s, box-shadow 0.18s;
    &:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
    }
    &__media {
      position: relative;
      height: 150px;
      background: var(--el-fill-color-light);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    &__img { width: 100%; height: 100%; object-fit: contain; }
    &__placeholder {
      width: 100%; height: 100%;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 44px; font-weight: 700;
    }
    &__off, &__warn {
      position: absolute; top: 8px; left: 8px;
      font-size: 12px; padding: 1px 8px; border-radius: 4px;
      color: #fff;
    }
    &__off { background: rgba(0, 0, 0, 0.45); }
    &__warn { background: var(--el-color-danger); left: auto; right: 8px; }
    &__actions {
      position: absolute; bottom: 0; left: 0; right: 0;
      display: flex; justify-content: center; gap: 16px;
      padding: 6px 0;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0; transition: opacity 0.18s;
    }
    &:hover &__actions { opacity: 1; }
    &__body { padding: 10px 12px 12px; }
    &__name {
      font-size: 14px; font-weight: 600; line-height: 20px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    &__meta {
      display: flex; align-items: center; gap: 6px; margin-top: 6px;
      .product-card__spec { font-size: 12px; color: var(--el-text-color-secondary); }
    }
    &__price { margin-top: 8px; display: flex; align-items: baseline; gap: 10px; }
    .price-sale { color: var(--el-color-danger); font-size: 16px; font-weight: 700; }
    .price-cost { font-size: 12px; color: var(--el-text-color-secondary); }
    &__stock {
      margin-top: 6px; font-size: 12px; color: var(--el-text-color-regular);
      display: flex; justify-content: space-between;
      .stock-low { color: var(--el-color-danger); }
    }
  }

  .empty-tip { grid-column: 1 / -1; padding: 40px 0; }

  .stock-adjust {
    &__head { display: flex; align-items: baseline; gap: 8px; font-size: 14px; }
    &__meta { font-size: 12px; color: var(--el-text-color-secondary); }
  }

  .detail {
    &__media { text-align: center; margin-bottom: 16px; }
    &__img { max-width: 100%; max-height: 260px; border-radius: 8px; object-fit: contain; background: var(--el-fill-color-light); }
    &__placeholder {
      width: 100%; height: 200px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 64px; font-weight: 700;
    }
    &__name { text-align: center; margin: 8px 0 16px; }
  }
}
</style>
