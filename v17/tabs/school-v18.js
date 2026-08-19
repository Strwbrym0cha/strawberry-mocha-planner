// V22.6: keep the School data logic stable and layer Course Corner presentation on top.
import { renderSchool as renderSchoolBase } from './school.js?v=22.6.0-course-corner';
import { installCourseCorner } from './course-corner.js?v=22.6.0-course-corner';

export function renderSchool(context){
  renderSchoolBase(context);
  installCourseCorner(context);
}
