import { Layout } from "@/layout/layout";
import { AboutPage } from "@/pages/about";
import { FragVisInd } from "@/pages/frag_vis_ind";
import { FragVisReg } from "@/pages/frag_vis_reg";
import { HomePage } from "@/pages/home";
import { SummStatFrag } from "@/pages/sum_stats_frag";
import { SummStatInd } from "@/pages/sum_stats_ind";
import { paths } from "@/paths";
import { Route, Routes } from "react-router-dom";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path={paths.others.about} element={<AboutPage />} />
        <Route path={paths.summary_stats.per_ind} element={<SummStatInd />} />
        <Route path={paths.summary_stats.per_frag} element={<SummStatFrag />} />
        <Route path={paths.fragment.vis_per_ind} element={<FragVisInd />} />
        <Route path={paths.fragment.vis_per_reg} element={<FragVisReg />} />
      </Route>
    </Routes>
  );
}
