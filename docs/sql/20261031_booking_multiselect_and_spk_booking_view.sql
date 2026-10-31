-- ==============================================================================
-- Migration: Multiple Select Jenis Layanan & Informasi Booking di SPK / Kunjungan
-- Database: dba_dev_pos & bengkeldarkopos | Schema: sch_fleet, sch_pos
-- Tanggal: 31 Oktober 2026
-- ==============================================================================
--
-- Perubahan:
-- 1. Memperlebar panjang kolom `jenis_layanan` pada `sch_fleet.booking_service`
--    dan `service_type` pada `sch_pos.tbl_fleet_booking_service` (beserta view
--    turunannya) dari VARCHAR(100) menjadi unlimited VARCHAR agar mendukung
--    multiple select jenis layanan yang digabung dengan koma (", ").
-- 2. Menambahkan kolom informasi booking pada view `sch_fleet.v_spk_pos_service`
--    (`booking_id`, `no_booking`, `tanggal_booking`, `jam_booking`,
--    `jenis_layanan_booking`, `waktu_booking`, `is_booking`) melalui join ke
--    view `sch_fleet.v_fleet_booking_service`.
-- 3. Memastikan semua pembacaan data di endpoint API Builder menggunakan view
--    pada schema `sch_fleet`.
-- ==============================================================================

BEGIN;

ALTER TABLE sch_pos.tbl_request_service
    ADD COLUMN IF NOT EXISTS booking_service_no character varying(100);

UPDATE pg_attribute SET atttypmod = -1
WHERE attrelid = 'sch_fleet.booking_service'::regclass AND attname = 'jenis_layanan';

UPDATE pg_attribute SET atttypmod = -1
WHERE attrelid = 'sch_pos.tbl_fleet_booking_service'::regclass AND attname = 'service_type';

UPDATE pg_attribute SET atttypmod = -1
WHERE attrelid = 'sch_fleet.v_fleet_booking_service'::regclass AND attname = 'jenis_layanan';

UPDATE pg_attribute SET atttypmod = -1
WHERE attrelid = 'sch_fleet.v_security_booking_active'::regclass AND attname = 'jenis_layanan';

CREATE OR REPLACE VIEW sch_fleet.v_spk_pos_service AS
SELECT
    wo.id,
    COALESCE(rs.logisticnotransspk, wo.wono) AS no_spk,
    wo.wono AS no_wo,
    wo.id AS id_antrian,
    COALESCE(b.id, rs.id) AS id_booking,
    mu.policeno AS no_polisi,
    COALESCE(m.membername, wo.drivername, 'Customer Fleet'::character varying) AS nama_customer,
    m.member_fleet_id AS id_pelanggan,
    COALESCE(wo.vehicle_km, 0::numeric)::integer AS odometer_km,
    NULL::text AS foto_odometer,
    COALESCE(wo.jobtype, rs.jobtype, 'Service Kendaraan'::character varying) AS keluhan_customer,
    COALESCE((
        SELECT CASE
            WHEN c.value = 1 THEN 'Belum Diperiksa'::text
            WHEN c.value = 2 THEN 'Perlu Perhatian'::text
            WHEN c.value = 3 THEN 'Rusak'::text
            ELSE 'Belum Diperiksa'::text
        END AS "case"
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
        END AS "case"
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
        END AS "case"
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
        END AS "case"
        FROM sch_pos.tbl_wo_check c
        WHERE c.woid = wo.id AND c.checkid = 4
        LIMIT 1
    ), 'Belum Diperiksa'::text) AS cek_kaki_kaki,
    mu.note::character varying AS catatan_kondisi_awal,
    COALESCE(sa.employeename, wo.serviceadvisorcode, 'Service Advisor'::character varying) AS nama_sa,
    'Foreman Bengkel'::character varying AS nama_foreman,
    COALESCE(mek.employeename, wo.employeecode, 'Teknisi KIM3'::character varying) AS nama_mekanik,
    CASE
        WHEN (p.id IS NOT NULL OR wo.status::text = 'C'::text) AND (km.waktu_check_out IS NOT NULL OR km.id IS NULL) THEN 'Selesai'::text
        WHEN (p.id IS NOT NULL OR wo.status::text = 'C'::text) AND km.waktu_check_out IS NULL THEN 'Siap Keluar'::text
        WHEN wo.testdrivedatefir IS NOT NULL THEN 'QC Passed'::text
        WHEN wo.servicefinishat IS NOT NULL THEN 'Selesai Dikerjakan'::text
        WHEN wo.servicestartat IS NOT NULL THEN 'Proses Pekerjaan'::text
        WHEN wo.timein IS NOT NULL OR km.waktu_masuk IS NOT NULL THEN 'Check In'::text
        ELSE 'Menunggu'::text
    END AS status_spk,
    COALESCE(p.total::numeric, (
        SELECT sum(wp.totalprice) AS sum
        FROM sch_pos.tbl_wo_product wp
        WHERE wp.woid = wo.id
    ), 0.00) AS estimasi_biaya,
    GREATEST(1::numeric, COALESCE(EXTRACT(epoch FROM wo.servicefinishat - wo.servicestartat) / 3600::numeric, 1::numeric))::integer AS estimasi_waktu_jam,
    CASE
        WHEN km.waktu_masuk IS NOT NULL THEN (km.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text)
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
        WHEN km.waktu_masuk IS NOT NULL THEN (km.waktu_check_out AT TIME ZONE 'Asia/Jakarta'::text)::timestamp with time zone
        ELSE COALESCE(
            p.finish_date::timestamp with time zone,
            (p.transdate + p.transtime)::timestamp with time zone,
            wo.testdrivedatefir::timestamp with time zone,
            wo.servicefinishat::timestamp with time zone
        )
    END::timestamp without time zone AS waktu_check_out,
    round(COALESCE(
        EXTRACT(epoch FROM COALESCE(
            km.waktu_check_out,
            p.finish_date::timestamp with time zone,
            (p.transdate + p.transtime)::timestamp with time zone,
            wo.servicefinishat::timestamp with time zone,
            CURRENT_TIMESTAMP
        ) - COALESCE(km.waktu_masuk, wo.timein::timestamp with time zone)) / 3600::numeric,
        1::numeric
    ), 2) AS lead_time_jam,
    wo.void_memo AS catatan_sa,
    NULL::text AS catatan_foreman,
    p.transno AS no_invoice,
    p.total AS total_invoice,
    p.status AS status_invoice,
    p.paid AS total_bayar,
    (
        SELECT mf.foto_data
        FROM sch_pos.ms_foto mf
        WHERE mf.kunjungan_id = km.id AND mf.jenis_event::text = 'MASUK'::text
        ORDER BY mf.id
        LIMIT 1
    ) AS foto_kendaraan,
    NULL::text AS foto_stnk,
    NULL::text AS foto_kir,
    wo.createdat AS created_at,
    wo.createdby AS input_by,
    wo.createdat AS input_date,
    wo.updatedby AS update_by,
    wo.updatedat AS update_dt,
    km.id AS id_kunjungan,
    b.id AS booking_id,
    b.no_booking AS no_booking,
    TO_CHAR(b.tanggal_booking, 'YYYY-MM-DD'::text) AS tanggal_booking,
    b.jam_booking AS jam_booking,
    b.jenis_layanan AS jenis_layanan_booking,
    b.created_at AS waktu_booking,
    (b.id IS NOT NULL OR km.booking_id IS NOT NULL OR UPPER(COALESCE(km.jenis_kedatangan::text, ''::text)) = 'BOOKING'::text) AS is_booking
FROM sch_pos.tbl_wo wo
LEFT JOIN sch_pos.tbl_member m ON wo.memberid = m.id
LEFT JOIN sch_pos.tbl_member_unit mu ON wo.policenoid = mu.id
LEFT JOIN sch_pos.tbl_employee sa ON wo.serviceadvisorcode::text = sa.employeeid::text
LEFT JOIN sch_pos.tbl_employee mek ON wo.employeecode::text = mek.employeeid::text
LEFT JOIN sch_pos.tbl_pos p ON wo.id = p.woid
LEFT JOIN sch_pos.tbl_request_service rs ON wo.norequestservice::text = rs.norequestservice::text
LEFT JOIN LATERAL (
    SELECT km_1.id,
           km_1.waktu_masuk,
           km_1.waktu_check_out,
           km_1.booking_id,
           km_1.jenis_kedatangan
    FROM sch_pos.kunjungan_masuk km_1
    WHERE replace(upper(km_1.no_polisi::text), ' '::text, ''::text) = replace(upper(mu.policeno::text), ' '::text, ''::text)
      AND (km_1.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text) <= (COALESCE(wo.servicefinishat, (now() AT TIME ZONE 'Asia/Jakarta'::text)) + '00:10:00'::interval)
      AND (km_1.waktu_check_out IS NULL OR (km_1.waktu_check_out AT TIME ZONE 'Asia/Jakarta'::text) >= (COALESCE(wo.timein, wo.createdat) - '00:10:00'::interval))
    ORDER BY (
        CASE
            WHEN (km_1.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text) <= COALESCE(wo.timein, wo.createdat)
             AND (km_1.waktu_check_out IS NULL OR (km_1.waktu_check_out AT TIME ZONE 'Asia/Jakarta'::text) >= COALESCE(wo.timein, wo.createdat)) THEN 0
            ELSE 1
        END
    ), (abs(EXTRACT(epoch FROM (km_1.waktu_masuk AT TIME ZONE 'Asia/Jakarta'::text) - COALESCE(wo.timein, wo.createdat)))), km_1.id
    LIMIT 1
) km ON true
LEFT JOIN LATERAL (
    SELECT b_1.id,
           b_1.no_booking,
           b_1.tanggal_booking,
           b_1.jam_booking,
           b_1.jenis_layanan,
           b_1.created_at
    FROM sch_fleet.v_fleet_booking_service b_1
    WHERE (km.booking_id IS NOT NULL AND b_1.id = km.booking_id)
       OR (
           km.booking_id IS NULL
           AND NULLIF(TRIM(rs.booking_service_no::text), ''::text) IS NOT NULL
           AND b_1.no_booking::text = TRIM(rs.booking_service_no::text)
       )
    ORDER BY
        CASE WHEN km.booking_id IS NOT NULL AND b_1.id = km.booking_id THEN 0 ELSE 1 END,
        b_1.id DESC
    LIMIT 1
) b ON true;

GRANT SELECT ON sch_fleet.v_spk_pos_service TO postgres;

COMMIT;
