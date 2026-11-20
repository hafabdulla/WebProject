//one bar per day
function BarChart({days}){
    let max = 0;
    for (let i = 0; i < days.length;i++){
        if(days[i].count > max){
            max = days[i].count;
        }
    }

  return (
    <div className="bar-chart">
      {days.map((day) => {
        let height = 0;
        if (max > 0) {
          height = (day.count / max) * 100;
        }
        return (
          <div className="bar-column" key={day.date}>
            <span className="bar-count">{day.count}</span>
            <div className="bar-area">
              <div className="bar" style={{ height: height + "%" }}></div>
            </div>
            <span className="bar-label">{day.date.slice(8, 10)}</span>
          </div>
        );
      })}
    </div>
    )
}
export default BarChart;