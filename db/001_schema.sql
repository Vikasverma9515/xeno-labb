-- Xeno Analytics Lab — core schema
-- Star-ish schema: dim_customer, dim_product, fact_orders, fact_campaign_events
-- NOTE: fact_campaign_events intentionally ships with ONLY a primary key at first.
-- See db/003_add_indexes.sql for the "make it fast at scale" case study.

drop table if exists fact_campaign_events cascade;
drop table if exists fact_orders cascade;
drop table if exists dim_product cascade;
drop table if exists dim_customer cascade;

create table dim_customer (
  customer_id     bigserial primary key,
  first_name      text not null,
  last_name       text not null,
  email           text not null,
  city            text not null,
  state           text not null,
  persona         text not null,        -- e.g. 'Trend Seeker', 'Value Shopper', 'Loyalist'
  signup_date     date not null
);

create table dim_product (
  product_id      bigserial primary key,
  name            text not null,
  category        text not null,
  price           numeric(10,2) not null
);

create table fact_orders (
  order_id        bigserial primary key,
  customer_id     bigint not null references dim_customer(customer_id),
  product_id      bigint not null references dim_product(product_id),
  order_date      timestamp not null,
  quantity        integer not null,
  unit_price      numeric(10,2) not null,
  revenue         numeric(12,2) not null
);

-- Deliberately large: this is the table the "query performance" case study is built on.
create table fact_campaign_events (
  event_id            bigserial primary key,
  customer_id         bigint not null references dim_customer(customer_id),
  channel             text not null,       -- whatsapp | sms | email | digital
  sent_at             timestamp not null,
  opened_at           timestamp,
  clicked_at          timestamp,
  converted_order_id  bigint references fact_orders(order_id)
);
