-- ==============================================================================
-- Fix: pencocokan SPK/WO ke kunjungan gerbang
-- Database: dba_dev_pos | Schema: sch_fleet
-- Tanggal: 22 Oktober 2026
-- ==============================================================================
--
-- Masalah:
--   v_spk_pos_service sebelumnya mengambil kunjungan gerbang TERAKHIR untuk
--   nopol yang sama (ORDER BY kg.id DESC), tanpa melihat rentang waktu WO.
--   Akibatnya WO lama pada nopol yang sama ikut memakai kunjungan terbaru
--   yang masih DI_DALAM, sehingga waktu_check_out menjadi NULL.
--
-- Perbaikan:
--   1. Cocokkan kunjungan gerbang dengan siklus hidup WO:
--      - nopol sama
--      - waktu masuk gerbang <= waktu selesai WO + toleransi 10 menit
--      - waktu keluar gerbang NULL atau >= waktu mulai WO - toleransi 10 menit
--   2. Prioritaskan kunjungan yang mengandung waktu mulai WO (timein/createdat),
--      lalu kunjungan dengan selisih waktu masuk terdekat.
--   3. Tambahkan kolom id_kunjungan agar endpoint dapat mengetahui tiket
--      gerbang yang benar-benar terkait dengan WO.
--   4. Bila tidak ada kunjungan yang cocok, tetap gunakan fallback lama dari
--      POS (finish_date / transdate+transtime / servicefinishat).
--
-- Catatan: tidak memakai trigger. View hanya dihitung ulang saat dibaca.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_service AS
SELECT
    wo.id,
    COALESCE(rs.logisticnotransspk, wo.wono) AS no_spk,
    wo.wono AS no_wo,
    wo.id AS id_antrian,
    rs.id AS id_booking,
    mu.policeno AS no_polisi,
    COALESCE(m.membername, wo.drivername, 'Customer Fleet'::character varying) AS nama_customer,
    m.member_fleet_id AS id_pelanggan,
    COALESCE(wo.vehicle_km, 0::numeric)::integer AS odometer_km,
    NULL::text AS foto_odometer,
    COALESCE(wo.jobtype, rs.jobtype, 'Service Kendaraan'::character varying) AS keluhan_customer,

    -- Kondisi fisik awal dari tbl_wo_check
    COALESCE((
        SELECT CASE
            WHEN c.value = 1 THEN 'Belum Diperiksa'::text
            WHEN c.value = 2 THEN 'Perlu Perhatian'::text
            WHEN c.value = 3 THEN 'Rusak'::text
            ELSE 'Belum Diperiksa'::text
        END
        FROM sch_pos.tbl_wo_check c
        WHERE c.woid = wo.id AND c.checkid = 1
        LIMIT 1
    ), 'Belum Diperiksa'::text) AS cek_body,
    COALESCE((
        SELECT CASE
            WHEN c.value = 1 THEN 'Belum Diperiksa'::text
            WHEN c.value = 2 THEN 'Perlu Perhatian'::text
            WHEN c.value = 3 THEN 'Rusak'::text
            ELSE 'Belum Diperiksa'::text
        END
        FROM sch_pos.tbl_wo_check c
        WHERE c.woid = wo.id AND c.checkid = 2
        LIMIT 1
    ), 'Belum Diperiksa'::text) AS cek_mesin,
    COALESCE((
        SELECT CASE
            WHEN c.value = 1 THEN 'Belum Diperiksa'::text
            WHEN c.value = 2 THEN 'Perlu Perhatian'::text
            WHEN c.value = 3 THEN 'Rusak'::text
            ELSE 'Belum Diperiksa'::text
        END
        FROM sch_pos.tbl_wo_check c
        WHERE c.woid = wo.id AND c.checkid = 3
        LIMIT 1
    ), 'Belum Diperiksa'::text) AS cek_kelistrikan,
    COALESCE((
        SELECT CASE
            WHEN c.value = 1 THEN 'Belum Diperiksa'::text
            WHEN c.value = 2 THEN 'Perlu Perhatian'::text
            WHEN c.value = 3 THEN 'Rusak'::text
            ELSE 'Belum Diperiksa'::text
        END
        FROM sch_pos.tbl_wo_check c
        WHERE c.woid = wo.id AND c.checkid = 4
        LIMIT 1
    ), 'Belum Diperiksa'::text) AS cek_kaki_kaki,

    mu.note::character varying AS catatan_kondisi_awal,
    COALESCE(sa.employeename, wo.serviceadvisorcode, 'Service Advisor'::character varying) AS nama_sa,
    'Foreman Bengkel'::character varying AS nama_foreman,
    COALESCE(mek.employeename, wo.employeecode, 'Teknisi KIM3'::character varying) AS nama_mekanik,

    -- Status SPK real-time
    CASE
        WHEN p.id IS NOT NULL OR wo.status::text = 'C'::text THEN 'Selesai'::text
        WHEN wo.testdrivedatefir IS NOT NULL THEN 'QC Passed'::text
        WHEN wo.servicefinishat IS NOT NULL THEN 'Selesai Dikerjakan'::text
        WHEN wo.servicestartat IS NOT NULL THEN 'Proses Pekerjaan'::text
        WHEN wo.timein IS NOT NULL OR kg.waktu_masuk IS NOT NULL THEN 'Check In'::text
        ELSE 'Menunggu'::text
    END AS status_spk,

    -- Estimasi & nilai transaksi
    COALESCE(p.total::numeric, (
        SELECT sum(wp.totalprice)
        FROM sch_pos.tbl_wo_product wp
        WHERE wp.woid = wo.id
    ), 0.00) AS estimasi_biaya,
    GREATEST(1::numeric, COALESCE(EXTRACT(epoch FROM wo.servicefinishat - wo.servicestartat) / 3600::numeric, 1::numeric))::integer AS estimasi_waktu_jam,

    -- Timeline milestones
    CASE
        WHEN kg.waktu_masuk IS NOT NULL THEN (kg.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text)
        ELSE wo.timein
    END AS waktu_check_in,
    wo.servicestartat AS waktu_mulai_pekerjaan,
    wo.servicefinishat AS waktu_selesai_pekerjaan,
    NULL::timestamp with time zone AS waktu_waiting_part,
    NULL::timestamp with time zone AS waktu_part_ready,
    wo.testdrivedatefir AS waktu_qc,
    wo.testdrivedatefir AS waktu_fir_closed,
    CASE
        WHEN p.id IS NOT NULL THEN (p.transdate + p.transtime)::timestamp with time zone
        ELSE NULL::timestamp with time zone
    END AS waktu_invoice,
    CASE
        WHEN kg.waktu_masuk IS NOT NULL THEN (kg.waktu_keluar AT TIME ZONE 'Asia/Jakarta'::text)::timestamp with time zone
        ELSE COALESCE(
            p.finish_date::timestamp with time zone,
            (p.transdate + p.transtime)::timestamp with time zone,
            wo.testdrivedatefir::timestamp with time zone,
            wo.servicefinishat::timestamp with time zone
        )
    END::timestamp without time zone AS waktu_check_out,

    -- Lead time
    round(COALESCE(
        EXTRACT(epoch FROM COALESCE(
            kg.waktu_keluar,
            p.finish_date::timestamp with time zone,
            (p.transdate + p.transtime)::timestamp with time zone,
            wo.servicefinishat::timestamp with time zone,
            CURRENT_TIMESTAMP
        ) - COALESCE(kg.waktu_masuk, wo.timein::timestamp with time zone)) / 3600::numeric,
        1::numeric
    ), 2) AS lead_time_jam,

    -- Catatan SA & QC
    wo.void_memo AS catatan_sa,
    NULL::text AS catatan_foreman,

    -- Invoice data dari tbl_pos
    p.transno AS no_invoice,
    p.total AS total_invoice,
    p.status AS status_invoice,
    p.paid AS total_bayar,

    -- Foto fisik kendaraan
    f.foto_data AS foto_kendaraan,
    NULL::text AS foto_stnk,
    NULL::text AS foto_kir,

    -- Audit timestamps
    wo.createdat AS created_at,
    wo.createdby AS input_by,
    wo.createdat AS input_date,
    wo.updatedby AS update_by,
    wo.updatedat AS update_dt,

    -- Tiket gerbang yang benar-benar terkait dengan WO ini.
    kg.id AS id_kunjungan

FROM sch_pos.tbl_wo wo
LEFT JOIN sch_pos.tbl_member m ON wo.memberid = m.id
LEFT JOIN sch_pos.tbl_member_unit mu ON wo.policenoid = mu.id
LEFT JOIN sch_pos.tbl_employee sa ON wo.serviceadvisorcode::text = sa.employeeid::text
LEFT JOIN sch_pos.tbl_employee mek ON wo.employeecode::text = mek.employeeid::text
LEFT JOIN sch_pos.tbl_pos p ON wo.id = p.woid
LEFT JOIN sch_pos.tbl_request_service rs ON wo.norequestservice::text = rs.norequestservice::text
LEFT JOIN sch_fleet.foto f
    ON f.kategori::text = 'KENDARAAN'::text
   AND f.referensi_id::text = replace(upper(mu.policeno::text), ' '::text, ''::text)
LEFT JOIN LATERAL (
    SELECT kg_1.id, kg_1.waktu_masuk, kg_1.waktu_keluar
    FROM sch_fleet.kunjungan_gerbang kg_1
    WHERE replace(upper(kg_1.no_polisi::text), ' ', '') = replace(upper(mu.policeno::text), ' ', '')
      -- Kunjungan harus sudah masuk sebelum WO selesai (atau sekarang bila masih berjalan).
      AND (kg_1.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text)
          <= COALESCE(wo.servicefinishat, (now() AT TIME ZONE 'Asia/Jakarta'::text)) + INTERVAL '10 minutes'
      -- Kunjungan harus belum keluar saat WO mulai.
      AND (
          kg_1.waktu_keluar IS NULL
          OR (kg_1.waktu_keluar AT TIME ZONE 'Asia/Jakarta'::text)
             >= COALESCE(wo.timein, wo.createdat) - INTERVAL '10 minutes'
      )
    ORDER BY
        -- Prioritaskan kunjungan yang mencakup waktu mulai WO.
        CASE
            WHEN (kg_1.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text) <= COALESCE(wo.timein, wo.createdat)
             AND (
                 kg_1.waktu_keluar IS NULL
                 OR (kg_1.waktu_keluar AT TIME ZONE 'Asia/Jakarta'::text) >= COALESCE(wo.timein, wo.createdat)
             )
            THEN 0
            ELSE 1
        END,
        -- Lalu kunjungan dengan waktu masuk paling dekat dengan waktu mulai WO.
        abs(EXTRACT(epoch FROM (
            (kg_1.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text) - COALESCE(wo.timein, wo.createdat)
        ))),
        kg_1.id
    LIMIT 1
) kg ON true;

GRANT SELECT ON sch_fleet.v_spk_pos_service TO postgres;

COMMIT;
