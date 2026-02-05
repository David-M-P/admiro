export const paths = {
  home: '/',
  summary_stats: {
    per_ind: '/summstats/ind',
    per_group: '/summstats/group',
    per_frag: '/summstats/frag',
  },
  fragment: {
    vis_per_ind: '/frag/visind',
    vis_per_reg: '/frag/visreg',
  },
  others: {
    about: '/about',
  }
} as const;
