# node — метрики хоста

Источник — `prometheus.exporter.unix` внутри Alloy (`metrics/alloy/config/node-exporter.alloy`). Агент раз в минуту пушит серии в VictoriaMetrics, путь `/api/v1/write`. Grafana читает их датасорсом `prometheus`.

| Файл (uid) | Что показывает | Переменные |
|---|---|---|
| `node-exporter-lite.json` (`node-lite`) | Обзор одного хоста: uptime, CPU, RAM, load, диск `/` и остальные ФС, disk I/O, сеть, ошибки и дропы | `instance` — `label_values(node_uname_info{job="node"}, instance)`. Значение ставит Alloy из `PT_HOST` |

Хост появляется в списке после того, как Alloy начал писать метрики. Отдельный список таргетов не нужен. Если фронт на другой машине и там тоже запущен Alloy, в списке будет два `instance`.
