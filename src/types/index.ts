export type DepartmentType = 'Отдел контента' | 'Коммерческий отдел';

export type ProductStatus = '🆕 Новый' | 'В работе' | '🔄 В работе' | 'Пауза' | '⏸️ На паузе' | 'Выполнено' | '✅ Выполнен';

export interface ProductItem {
  id: string;                      // ID (1, 2, 3...)
  externalCode: string;            // Внешний код
  group3: string;                  // Группа 3
  title: string;                   // Наименование
  status: string;                  // Статус
  pauseReason: string;             // Причина паузы
  pauseDate: string;               // Дата паузы
  executor: string;                // Исполнитель
  dateTaken: string;               // Дата взятия
  dateCompleted: string;           // Дата выполнения
  dateFinished: string;            // Дата завершения работы
  sourceFile: string;              // Источник (название файла)
  dateUploaded: string;            // Дата загрузки
  department: DepartmentType;
}

export interface FileGroupSummary {
  fileName: string;
  group3: string;
  totalProducts: number;
  newCount: number;
  inWorkCount: number;
  doneCount: number;
  groupStatus: '🆕 Новый' | '🔄 В работе' | '⏸️ На паузе' | '✅ Выполнен';
  pauseReason: string;
  pauseDate: string;
  executor: string;
  startDate: string;
  endDate: string;
  addedDate: string;
  daysPassed: number;
  department: DepartmentType;
}

export interface SupplierContact {
  id: string;
  producer: string;     // Производитель
  site: string;         // Оф.сайт
  contact: string;      // Контакт
  name: string;         // Имя
  productGroups: string;// Группы товаров
  note: string;         // Примечание
}

export interface NewProductItem {
  id: string;
  externalCode: string;           // Внешний код
  title: string;                  // Наименование
  createdDate: string;            // Дата создания
  managerCode: string;            // Цифровой код менеджера
  sectionName: string;            // Название раздела
  manager: string;                // Менеджер
  content: string;                // Контент
  batchDate: string;              // Дата партии
  batchFile: string;              // Имя файла
  batchTitle?: string;            // Заголовок партии (строка загрузки)
  isAdded?: boolean;              // Добавлено в базу
  isExported?: boolean;           // Выгружено в файл
}

export interface CategoryGroup {
  id: string;
  group1: string;                 // Группа 1
  group2: string;                 // Группа 2
  group3: string;                 // Группа 3
  manager: string;                // Менеджер
  includedMaterik: string;        // Влючено Материк
  includedPalas: string;          // Включено Палас
  skuCount: string;               // Количество скю
  startDate: string;              // Дата начала работ
  donorRequestDate: string;       // Отправка КМ запроса на сайты-доноры
  donorReceivedDate: string;      // Дата получения сайтов доноров
  approvalSentDate: string;       // Дата отправки на согласование
  approvalDate: string;           // Дата согласования
  releaseDate: string;            // Дата вывода на Материк (с товарами)
  palasAllocated: string;         // Выделено на сайт Палас
  kamFile: string;                // Добавлено в файл КАМ
}

export interface GroupOrderItem {
  id: string;
  position: number;
  groupName: string;
  section: string;
  status: string;
  comment?: string;
  group1?: string;
  group2?: string;
  group3?: string;
}

export type TaskStatus = 'Новая' | 'В работе' | 'Завершена';
export type TaskUrgency = 'Текущая задача' | 'Срочно';

export interface TaskItem {
  id: string;
  title: string;                  // Тема
  description: string;            // Описание (Markdown)
  executors: string;              // Исполнители
  status: TaskStatus;             // Статус
  urgency: TaskUrgency;           // Срочность
  imageBase64: string;            // Изображения Base64
  createdAt: string;              // Дата создания
  updatedAt: string;              // Дата обновления
}
