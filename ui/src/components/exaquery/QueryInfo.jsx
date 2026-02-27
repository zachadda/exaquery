import React from "react";
import { formatDistanceToNow, formatDuration, intervalToDuration } from "date-fns";
import DataTable from "react-data-table-component";
import "./QueryInfo.scss";

function writePre(query) {
  if (!query) return [];
  return query.split("\n").map((line, i) => <code key={i}>{line}</code>);
}

function preciseDiff(start, stop) {
  const dur = intervalToDuration({ start: new Date(start), end: new Date(stop) });
  return formatDuration(dur, { delimiter: ", " }) || "0 seconds";
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
}

function showQueryInfo(d) {
  const adjustedQueryDuration = d.DURATION
    ? (d.DURATION * d.RESOURCES) / 100
    : 0;

  return (
    <dl className="queryInfo">
      <dt>Class</dt>
      <dd className={`command_class ${d.COMMAND_CLASS}`}>
        <tt>{d.COMMAND_CLASS}</tt>
      </dd>
      <dt>Name</dt>
      <dd className={`command_name ${d.COMMAND_NAME}`}>
        <tt>{d.COMMAND_NAME}</tt>
      </dd>
      <dt>Success</dt>
      <dd className="query_SUCCESS">
        <tt>{d.SUCCESS ? "YES" : "NO"}</tt>
      </dd>
      <dt>Start</dt>
      <dd className="query_start">
        <tt>{d.START_TIME}</tt>, {timeAgo(d.START_TIME)}
      </dd>
      <dt>End</dt>
      <dd className="query_end">
        <tt>{d.STOP_TIME}</tt>, {timeAgo(d.STOP_TIME)}
      </dd>
      <dt>Duration</dt>
      <dd className="query_duration">
        <tt>{d.DURATION ? d.DURATION.toLocaleString() : "0"}</tt> seconds
        {d.START_TIME && d.STOP_TIME && ` (${preciseDiff(d.START_TIME, d.STOP_TIME)})`}
      </dd>
      <dt>Potential Duration</dt>
      <dd className="adjusted_query_duration">
        <tt>{adjustedQueryDuration.toLocaleString()}</tt> seconds
      </dd>
      <dt>Row Count</dt>
      <dd className="row_count">
        {d.ROW_COUNT ? d.ROW_COUNT.toLocaleString() : "-"}
      </dd>
      <dt>Execution mode</dt>
      <dd className="execution_mode">{d.EXECUTION_MODE}</dd>
      <dt>Priority</dt>
      <dd className="query_priority">{d.PRIORITY}</dd>
    </dl>
  );
}

function showResourceInfo(d) {
  const hddReadClasses = "hdd_read" + (+d.HDD_READ > 0 ? " real_read" : "");
  return (
    <dl className="resourceInfo">
      <dt>Resources</dt>
      <dd className="resources"><tt>{d.RESOURCES}</tt></dd>
      <dt>CPU</dt>
      <dd className="cpu"><tt>{d.CPU}</tt></dd>
      <dt>HDD Read</dt>
      <dd className={hddReadClasses}><tt>{d.HDD_READ}</tt></dd>
      <dt>HDD Write</dt>
      <dd className="hdd_write"><tt>{d.HDD_WRITE}</tt></dd>
      <dt>Net</dt>
      <dd className="net"><tt>{d.NET}</tt></dd>
      <dt>Persistent RAM Peak</dt>
      <dd className="p_db_ram_peak"><tt>{d.PERSISTENT_DB_RAM_PEAK}</tt></dd>
      <dt>Temporary RAM Peak</dt>
      <dd className="t_db_ram_peak"><tt>{d.TEMP_DB_RAM_PEAK}</tt></dd>
    </dl>
  );
}

function showSessionInfo(d) {
  return (
    <dl className="sessionInfo">
      <dt>User Name</dt>
      <dd className="user_name"><tt>{d.USER_NAME}</tt></dd>
      <dt>Host</dt>
      <dd className="host"><tt>{d.HOST}</tt></dd>
      <dt>OS User</dt>
      <dd className="os_user"><tt>{d.OS_USER}</tt></dd>
      <dt>Client</dt>
      <dd className="client"><tt>{d.CLIENT}</tt></dd>
      <dt>Driver</dt>
      <dd className="driver"><tt>{d.DRIVER}</tt></dd>
      <dt>OS</dt>
      <dd className="os"><tt>{d.OS_NAME}</tt></dd>
      <dt>Encrypted</dt>
      <dd className="encrypted"><tt>{d.ENCRYPTED ? "YES" : "NO"}</tt></dd>
      <dt>Scope Schema</dt>
      <dd className="scope_schema"><tt>{d.SCOPE_SCHEMA}</tt></dd>
      <dt>Session login successful?</dt>
      <dd className="session_success"><tt>{d.SESSION_SUCCESS ? "YES" : "NO"}</tt></dd>
      <dt>Session Start</dt>
      <dd className="query_start"><tt>{d.LOGIN_TIME}</tt>, {timeAgo(d.LOGIN_TIME)}</dd>
      <dt>End</dt>
      <dd className="query_end"><tt>{d.LOGOUT_TIME}</tt>, {timeAgo(d.LOGOUT_TIME)}</dd>
    </dl>
  );
}

function showQuery(d) {
  return (
    <div className="query">
      <pre className="sql_text">{writePre(d.SQL_TEXT)}</pre>
      {d.ERROR_TEXT && (
        <div className="Error">
          <dt>Error code</dt>
          <dd><tt>{d.ERROR_CODE}</tt></dd>
          <pre className="error_text">{writePre(d.ERROR_TEXT)}</pre>
        </div>
      )}
    </div>
  );
}

function showProfiling(p) {
  const durationThreshold = Math.max(...p.map((d) => +d.DURATION));

  const conditionalRowStyles = [
    {
      when: (row) => +row.DURATION < 0.05 && +row.DURATION < 0.1 * durationThreshold,
      style: { color: "#5c6178" },
    },
    {
      when: (row) => +row.DURATION > 0.3,
      style: { backgroundColor: "rgba(239,68,68,0.08)" },
    },
    {
      when: (row) => +row.DURATION > 1,
      style: { backgroundColor: "rgba(239,68,68,0.15)" },
    },
    {
      when: (row) => +row.DURATION > 1 && row.REMARKS === "ExpressionIndex",
      style: { color: "#ef4444" },
    },
    {
      when: (row) => {
        if (!row.PART_INFO) return false;
        const inRows = +row.IN_ROWS;
        const outRows = +row.OUT_ROWS;
        return row.PART_INFO.includes("NL ") && inRows > 100 && outRows >= (inRows * inRows) / 100;
      },
      style: { color: "#ef4444" },
    },
    {
      when: (row) => durationThreshold > 1 && +row.DURATION > 0.5 * durationThreshold,
      style: { backgroundColor: "rgba(239,68,68,0.22)" },
    },
    {
      when: (row) => durationThreshold > 1 && +row.DURATION >= 0.95 * durationThreshold,
      style: { backgroundColor: "rgba(239,68,68,0.35)" },
    },
  ];

  const columns = [
    { name: "#", selector: (row) => row.PART_ID, width: "30px", sortable: true },
    { name: "Time", selector: (row) => +row.DURATION, width: "60px", sortable: true },
    { name: "Name", selector: (row) => row.PART_NAME, width: "140px", sortable: true },
    { name: "Info", selector: (row) => row.PART_INFO, width: "200px", sortable: true },
    { name: "Object", selector: (row) => row.OBJECT_NAME, width: "150px", sortable: true },
    {
      name: "In",
      selector: (row) => +row.IN_ROWS,
      width: "80px",
      format: (row) => (+row.IN_ROWS).toLocaleString(),
      sortable: true,
    },
    {
      name: "Out",
      selector: (row) => +row.OUT_ROWS,
      width: "80px",
      format: (row) => (+row.OUT_ROWS).toLocaleString(),
      sortable: true,
    },
    { name: "Remarks", selector: (row) => row.REMARKS, sortable: true },
  ];

  return (
    <DataTable
      title="Profile"
      columns={columns}
      data={p}
      fixedHeader
      fixedHeaderScrollHeight="500px"
      conditionalRowStyles={conditionalRowStyles}
      theme="dark"
    />
  );
}

function StmInfo({ info }) {
  return (
    <div className="QueryInfo">
      <h1>
        Session {info.SESSION_ID}, #{info.STMT_ID}
      </h1>
      {showQueryInfo(info)}
      {showSessionInfo(info)}
      {showResourceInfo(info)}
      {showQuery(info)}
    </div>
  );
}

export default function QueryInfo({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return <div className="QueryInfo loading">Loading info&hellip;</div>;
  }
  if (!data.info || data.info.length === 0) {
    return (
      <div className="QueryInfo">
        No info. This is a group of queries. Zoom in to get individual statements.
      </div>
    );
  }

  return (
    <div>
      <StmInfo info={data.info[0]} />
      {data.profile && (
        <div className="profile">{showProfiling(data.profile)}</div>
      )}
    </div>
  );
}
